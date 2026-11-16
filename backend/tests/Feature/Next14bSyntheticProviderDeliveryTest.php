<?php

namespace Tests\Feature;

use App\Application\Integrations\StageSyntheticProviderDelivery;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class Next14bSyntheticProviderDeliveryTest extends TestCase
{
    private const SECRET = 'SYNTHETIC-QA-DELIVERY-SECRET-NOT-REAL-2026';

    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('warehouses', function (Blueprint $t): void {
            $t->id();
            $t->unsignedBigInteger('company_id');
            $t->boolean('active')->default(true);
        });
        $this->artisan('migrate', [
            '--path' => 'database/migrations/2026_11_14_000023_create_business_units_and_commerce_inbox.php',
            '--force' => true,
        ])->run();
        config()->set('finai.synthetic_commerce_staging_enabled', true);
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name' => $name, 'active' => true]);
    }

    private function actor(Company $company, string $name, bool $writer = true): User
    {
        $actor = User::query()->create([
            'name' => $name,
            'email' => strtolower($name).'@example.test',
            'password' => 'synthetic-only-password', 'active' => true,
        ]);
        $actor->forceFill(['email_verified_at' => now()])->save();
        $role = DB::table('roles')->insertGetId([
            'key' => 'next14b-'.$actor->id,
            'name' => 'NEXT14B synthetic only', 'system' => true,
        ]);
        if ($writer) {
            $permission = DB::table('permissions')->where('key', 'orders.write')->value('id');
            if (! $permission) {
                $permission = DB::table('permissions')->insertGetId([
                    'key' => 'orders.write', 'name' => 'Orders write',
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id' => $role, 'permission_id' => $permission,
            ]);
        }
        $actor->companies()->attach($company->id, [
            'role_id' => $role, 'status' => 'active',
            'joined_at' => now(),
        ]);
        return $actor;
    }

    private function source(Company $company, string $provider): int
    {
        $warehouse = DB::table('warehouses')->insertGetId([
            'company_id' => $company->id, 'active' => true,
        ]);
        $connection = DB::table('commerce_connections')->insertGetId([
            'company_id' => $company->id,
            'code' => $provider === 'shopify' ? 'SYN-SHOP-01' : 'SYN-WOO-01',
            'provider' => $provider, 'status' => 'draft',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('commerce_sku_mappings')->insert([
            'company_id' => $company->id, 'connection_id' => $connection,
            'external_sku' => 'TAB-10070', 'internal_sku' => 'TAB-10070',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $warehouse;
    }

    private function delivery(Company $company, string $provider, int $warehouse): array
    {
        $id = $provider === 'shopify'
            ? '11111111-2222-4333-8444-555555555555' : '7001';
        $event = $provider === 'shopify'
            ? 'SYN-SHOP-11111111222243338444555555555555'
            : 'SYN-WC-DEL-7001';
        $data = [
            'demoOnly' => true, 'companyId' => $company->id,
            'provider' => $provider,
            'connectionCode' => $provider === 'shopify' ? 'SYN-SHOP-01' : 'SYN-WOO-01',
            'warehouseId' => $warehouse, 'eventId' => $event,
            'externalOrderId' => 'SYN-ORDER-EXAMPLE-0001',
            'currency' => 'EUR',
            'lines' => [['sku' => 'TAB-10070', 'quantity' => 2, 'unitPriceCents' => 12500]],
            'totalCents' => 25000,
            'issuedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
        $raw = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        return [$raw, $this->headers($provider, $raw, $id), $data];
    }

    private function headers(string $provider, string $raw, string $deliveryId): array
    {
        $signature = base64_encode(hash_hmac('sha256', $raw, self::SECRET, true));
        if ($provider === 'shopify') {
            return [
                'Content-Type' => 'application/json',
                'X-Shopify-Hmac-SHA256' => $signature,
                'X-Shopify-Topic' => 'orders/create',
                'X-Shopify-Shop-Domain' => 'synthetic-shop.myshopify.com',
                'X-Shopify-Webhook-Id' => $deliveryId,
            ];
        }
        return [
            'CONTENT-TYPE' => 'application/json',
            'x-wc-webhook-signature' => $signature,
            'X-WC-Webhook-Topic' => 'order.created',
            'X-WC-Webhook-Resource' => 'order',
            'X-WC-Webhook-Delivery-ID' => $deliveryId,
        ];
    }

    private function rejects(callable $operation): void
    {
        try {
            $operation();
            $this->fail('Unsafe provider delivery should have failed closed.');
        } catch (\DomainException $error) {
            $this->assertNotEmpty($error->getMessage());
        }
    }

    public function test_both_synthetic_provider_headers_are_verified_scoped_and_idempotent(): void
    {
        $company = $this->company('Synthetic A');
        $writer = $this->actor($company, 'writer');
        $gateway = app(StageSyntheticProviderDelivery::class);
        foreach (['shopify', 'woocommerce'] as $provider) {
            $warehouse = $this->source($company, $provider);
            [$raw, $headers] = $this->delivery($company, $provider, $warehouse);
            $first = $gateway->execute(
                $company->id, $writer->id, $provider, $raw, $headers, self::SECRET);
            $this->assertFalse($first['replayed']);
            $this->assertTrue($first['demo_only']);
            $this->assertSame('review', $first['status']);
            $this->assertTrue($gateway->execute(
                $company->id, $writer->id, $provider, $raw, $headers, self::SECRET
            )['replayed']);
        }
        $this->assertDatabaseCount('commerce_order_events', 2);
        $this->assertDatabaseCount('audit_logs', 2);
        foreach (DB::table('commerce_order_events')->get() as $row) {
            $normalized = json_decode($row->normalized_json, true, 32, JSON_THROW_ON_ERROR);
            $this->assertTrue($normalized['demo_only']);
            $this->assertFalse($normalized['posting']);
            $this->assertArrayNotHasKey('shop_domain', $normalized);
            $this->assertArrayNotHasKey('customer', $normalized);
        }
    }

    public function test_invalid_signatures_delivery_id_and_unexpected_headers_fail_before_staging(): void
    {
        $company = $this->company('Synthetic A');
        $writer = $this->actor($company, 'writer');
        $warehouse = $this->source($company, 'shopify');
        [$raw, $headers] = $this->delivery($company, 'shopify', $warehouse);
        $gateway = app(StageSyntheticProviderDelivery::class);
        foreach ([
            [...$headers, 'X-Shopify-Webhook-Id' => '22222222-2222-4333-8444-555555555555'],
            [...$headers, 'X-Shopify-Topic' => 'orders/updated'],
            [...$headers, 'X-Shopify-Shop-Domain' => 'real-shop.myshopify.com'],
            [...$headers, 'X-Shopify-Hmac-SHA256' => str_repeat('A', 43).'='],
            [...$headers, 'x-shopify-hmac-sha256' => $headers['X-Shopify-Hmac-SHA256']],
            [...$headers, 'Authorization' => 'secret'],
        ] as $wrong) {
            $this->rejects(fn () => $gateway->execute(
                $company->id, $writer->id, 'shopify', $raw, $wrong, self::SECRET));
        }
        $this->rejects(fn () => $gateway->execute(
            $company->id, $writer->id, 'shopify', $raw.' ', $headers, self::SECRET));
        $this->assertDatabaseCount('commerce_order_events', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_woocommerce_delivery_scope_permissions_and_pii_checks(): void
    {
        $company = $this->company('Synthetic A');
        $foreign = $this->company('Synthetic B');
        $writer = $this->actor($company, 'writer');
        $reader = $this->actor($company, 'reader', false);
        $outsider = $this->actor($foreign, 'outsider');
        $warehouse = $this->source($company, 'woocommerce');
        [$raw, $headers, $payload] = $this->delivery($company, 'woocommerce', $warehouse);
        $gateway = app(StageSyntheticProviderDelivery::class);
        foreach ([$reader, $outsider] as $invalidActor) {
            $this->rejects(fn () => $gateway->execute(
                $company->id, $invalidActor->id,
                'woocommerce', $raw, $headers, self::SECRET));
        }
        $this->rejects(fn () => $gateway->execute(
            $foreign->id, $outsider->id, 'woocommerce',
            $raw, $headers, self::SECRET));
        $modified = [...$payload, 'customer' => ['email' => 'sample@example.test']];
        $rawModified = json_encode($modified, JSON_THROW_ON_ERROR);
        $modifiedHeaders = $this->headers('woocommerce', $rawModified, '7001');
        $this->rejects(fn () => $gateway->execute(
            $company->id, $writer->id, 'woocommerce', $rawModified,
            $modifiedHeaders, self::SECRET));
        $this->rejects(fn () => $gateway->execute(
            $company->id, $writer->id, 'woocommerce', $raw,
            [...$headers, 'X-WC-Webhook-Delivery-ID' => '8001'], self::SECRET));
        $this->assertDatabaseCount('commerce_order_events', 0);
    }

    public function test_synthetic_gateway_is_off_by_default_even_with_valid_signature(): void
    {
        $company = $this->company('Synthetic A');
        $writer = $this->actor($company, 'writer');
        $warehouse = $this->source($company, 'shopify');
        [$raw, $headers] = $this->delivery($company, 'shopify', $warehouse);
        config()->set('finai.synthetic_commerce_staging_enabled', false);
        $this->rejects(fn () => app(StageSyntheticProviderDelivery::class)->execute(
            $company->id, $writer->id, 'shopify', $raw, $headers, self::SECRET));
        $this->assertDatabaseCount('commerce_order_events', 0);
    }
}
