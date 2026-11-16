<?php

namespace Tests\Feature;

use App\Application\Integrations\StageSyntheticProviderOrder;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class Next14cSyntheticProviderOrdersTest extends TestCase
{
    private const SECRET = 'SYNTHETIC-ONLY-PROVIDER-ORDER-HMAC-NOT-REAL-2026';

    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('warehouses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->boolean('active')->default(true);
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

    private function actor(Company $company, string $login, bool $write): User
    {
        $actor = User::query()->create([
            'name' => $login, 'email' => $login.'@example.test',
            'password' => 'synthetic-only-test-password', 'active' => true,
        ]);
        $actor->forceFill(['email_verified_at' => now()])->save();
        $roleId = DB::table('roles')->insertGetId([
            'key' => 'next14c-'.$actor->id, 'name' => 'NEXT14C role', 'system' => true,
        ]);
        if ($write) {
            $permission = DB::table('permissions')
                ->where('key', 'orders.write')->value('id');
            if (! $permission) {
                $permission = DB::table('permissions')->insertGetId([
                    'key' => 'orders.write', 'name' => 'Orders write',
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id' => $roleId, 'permission_id' => $permission,
            ]);
        }
        $actor->companies()->attach($company->id, [
            'role_id' => $roleId, 'status' => 'active', 'joined_at' => now(),
        ]);
        return $actor;
    }

    private function fixtures(Company $company, string $provider): int
    {
        $warehouse = DB::table('warehouses')->insertGetId([
            'company_id' => $company->id, 'active' => true,
        ]);
        $connection = DB::table('commerce_connections')->insertGetId([
            'company_id' => $company->id,
            'code' => $this->code($provider),
            'provider' => $provider, 'status' => 'draft',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('commerce_sku_mappings')->insert([
            'company_id' => $company->id, 'connection_id' => $connection,
            'external_sku' => 'SYN-TAB-10070', 'internal_sku' => 'SYN-TAB-10070',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $warehouse;
    }

    private function code(string $provider): string
    {
        return $provider === 'shopify' ? 'SYN-SHOP-01' : 'SYN-WOO-01';
    }

    private function payload(string $provider): array
    {
        $data = [
            'id' => 7001, 'demoOnly' => true,
            'issuedAt' => gmdate('Y-m-d\TH:i:s\Z'),
            'currency' => 'EUR',
        ];
        if ($provider === 'shopify') {
            return [
                ...$data, 'total_price' => '250.00',
                'line_items' => [
                    ['sku' => 'SYN-TAB-10070', 'quantity' => 2, 'price' => '125.00'],
                ],
            ];
        }
        return [
            ...$data, 'total' => '250.00',
            'line_items' => [
                ['sku' => 'SYN-TAB-10070', 'quantity' => 2,
                 'price' => '125.00', 'total' => '250.00'],
            ],
        ];
    }

    private function signed(string $provider, array $payload): array
    {
        $raw = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $signature = base64_encode(hash_hmac('sha256', $raw, self::SECRET, true));
        if ($provider === 'shopify') {
            return [$raw, [
                'Content-Type' => 'application/json',
                'X-Shopify-Topic' => 'orders/create',
                'X-Shopify-Hmac-SHA256' => $signature,
                'X-Shopify-Shop-Domain' => 'synthetic-shop.myshopify.com',
                'X-Shopify-Webhook-Id' => '11111111-2222-4333-8444-555555555555',
            ]];
        }
        return [$raw, [
            'Content-Type' => 'application/json',
            'X-WC-Webhook-Topic' => 'order.created',
            'X-WC-Webhook-Resource' => 'order',
            'X-WC-Webhook-Signature' => $signature,
            'X-WC-Webhook-Delivery-ID' => '7001',
        ]];
    }

    private function send(int $company, int $actor, string $provider,
        string $raw, array $headers, int $warehouse): array
    {
        return app(StageSyntheticProviderOrder::class)->execute(
            $company, $actor, $provider, $raw, $headers,
            self::SECRET, $this->code($provider), $warehouse);
    }

    private function rejects(callable $fn): void
    {
        try {
            $fn();
            $this->fail('Synthetic adapter must reject unsafe orders.');
        } catch (\DomainException $error) {
            $this->assertNotSame('', $error->getMessage());
        }
    }

    public function test_both_provider_shaped_orders_stage_only_synthetic_review_and_dedupe(): void
    {
        $company = $this->company('Synthetic A');
        $actor = $this->actor($company, 'writer', true);
        foreach (['shopify', 'woocommerce'] as $provider) {
            $warehouse = $this->fixtures($company, $provider);
            [$raw, $headers] = $this->signed($provider, $this->payload($provider));
            $first = $this->send($company->id, $actor->id,
                $provider, $raw, $headers, $warehouse);
            $second = $this->send($company->id, $actor->id,
                $provider, $raw, $headers, $warehouse);
            $this->assertFalse($first['replayed']);
            $this->assertTrue($second['replayed']);
            $this->assertSame('review', $first['status']);
            $this->assertSame($first['id'], $second['id']);
        }
        $this->assertDatabaseCount('commerce_order_events', 2);
        $this->assertDatabaseCount('audit_logs', 2);
        foreach (DB::table('commerce_order_events')->get() as $entry) {
            $stored = json_decode($entry->normalized_json, true, 32, JSON_THROW_ON_ERROR);
            $this->assertTrue($stored['demo_only']);
            $this->assertFalse($stored['posting']);
            $this->assertSame('review', $stored['status']);
            $this->assertSame(25000, $stored['total_cents']);
            $this->assertSame('SYN-TAB-10070', $stored['lines'][0]['internal_sku']);
            $this->assertArrayNotHasKey('customer', $stored);
            $this->assertArrayNotHasKey('billing', $stored);
        }
    }

    public function test_changed_signed_body_wrong_total_and_personal_data_fail_closed(): void
    {
        $company = $this->company('Synthetic A');
        $actor = $this->actor($company, 'writer', true);
        $warehouse = $this->fixtures($company, 'woocommerce');
        [$raw, $headers] = $this->signed('woocommerce', $this->payload('woocommerce'));
        $this->rejects(fn () => $this->send($company->id, $actor->id,
            'woocommerce', $raw.' ', $headers, $warehouse));
        foreach ([
            ['customer' => ['email' => 'person@example.test']],
            ['billing' => ['address_1' => 'fiction']],
            ['total' => '249.99'], ['total' => 250.00], ['currency' => 'USD'],
            ['demoOnly' => false], ['id' => 1234],
            ['issuedAt' => gmdate('Y-m-d\TH:i:s\Z', time()-1200)],
            ['line_items' => [['sku' => 'SYN-TAB-10070', 'quantity' => 2,
                'price' => '125.00', 'total' => '249.99']]],
        ] as $bad) {
            [$signedRaw, $signedHeaders] = $this->signed('woocommerce',
                [...$this->payload('woocommerce'), ...$bad]);
            $this->rejects(fn () => $this->send(
                $company->id, $actor->id, 'woocommerce',
                $signedRaw, $signedHeaders, $warehouse));
        }
        $this->assertDatabaseCount('commerce_order_events', 0);
    }

    public function test_tenant_permission_and_warehouse_are_checked_before_any_audit(): void
    {
        $company = $this->company('Synthetic A');
        $foreign = $this->company('Synthetic B');
        $writer = $this->actor($company, 'writer', true);
        $reader = $this->actor($company, 'reader', false);
        $otherWriter = $this->actor($foreign, 'otherwriter', true);
        $warehouse = $this->fixtures($company, 'shopify');
        [$raw, $headers] = $this->signed('shopify', $this->payload('shopify'));
        $this->rejects(fn () => $this->send(
            $company->id, $reader->id, 'shopify', $raw, $headers, $warehouse));
        $this->rejects(fn () => $this->send(
            $company->id, $otherWriter->id, 'shopify', $raw, $headers, $warehouse));
        $this->rejects(fn () => $this->send(
            $foreign->id, $otherWriter->id, 'shopify', $raw, $headers, $warehouse));
        $this->assertDatabaseCount('commerce_order_events', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_disabled_adapter_rejects_valid_signed_synthetic_order(): void
    {
        $company = $this->company('Synthetic A');
        $actor = $this->actor($company, 'writer', true);
        $warehouse = $this->fixtures($company, 'shopify');
        [$raw, $headers] = $this->signed('shopify', $this->payload('shopify'));
        config()->set('finai.synthetic_commerce_staging_enabled', false);
        $this->rejects(fn () => $this->send(
            $company->id, $actor->id, 'shopify', $raw, $headers, $warehouse));
        $this->assertDatabaseCount('commerce_order_events', 0);
    }
}
