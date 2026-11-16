<?php

namespace Tests\Feature;

use App\Application\Integrations\StageSyntheticProviderOrder;
use App\Application\Integrations\SyntheticCommerceReview;
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
        // Read permission is distinct from write, enabling true reviewer-only
        // actors to inspect the PII-free inbox without changing any order.
        $readPermission = DB::table('permissions')->where('key', 'orders.read')->value('id');
        if (! $readPermission) {
            $readPermission = DB::table('permissions')->insertGetId([
                'key' => 'orders.read', 'name' => 'Synthetic commerce review read',
            ]);
        }
        DB::table('permission_role')->insert([
            'role_id' => $roleId, 'permission_id' => $readPermission,
        ]);
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

    public function test_same_synthetic_order_under_new_delivery_id_is_idempotent_but_changed_lines_fail(): void
    {
        $company = $this->company('Synthetic A');
        $actor = $this->actor($company, 'writer', true);
        foreach (['shopify', 'woocommerce'] as $provider) {
            $warehouse = $this->fixtures($company, $provider);
            [$raw, $originalHeaders] = $this->signed($provider, $this->payload($provider));
            $original = $this->send(
                $company->id, $actor->id, $provider, $raw, $originalHeaders, $warehouse);
            $otherHeader = $provider === 'shopify'
                ? ['X-Shopify-Webhook-Id' => '22222222-2222-4333-8444-555555555555']
                : ['X-WC-Webhook-Delivery-ID' => '7002'];
            $newDeliveryHeaders = [...$originalHeaders, ...$otherHeader];

            // Same provider order, same normalized data, different signed delivery:
            // no duplicate order/event row and no duplicate audit.
            $redelivered = $this->send(
                $company->id, $actor->id, $provider, $raw, $newDeliveryHeaders, $warehouse);
            $this->assertTrue($redelivered['replayed']);
            $this->assertSame($original['id'], $redelivered['id']);

            $changed = $this->payload($provider);
            $changed['line_items'][0]['price'] = '125.50';
            if ($provider === 'shopify') {
                $changed['total_price'] = '251.00';
            } else {
                $changed['line_items'][0]['total'] = '251.00';
                $changed['total'] = '251.00';
            }
            [$alteredRaw, $alteredHeaders] = $this->signed($provider, $changed);
            $alteredHeaders = [...$alteredHeaders, ...$otherHeader];
            $this->rejects(fn () => $this->send($company->id, $actor->id,
                $provider, $alteredRaw, $alteredHeaders, $warehouse));
        }
        $this->assertDatabaseCount('commerce_order_events', 2);
        $this->assertDatabaseCount('audit_logs', 2);
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

    public function test_synthetic_commerce_reviewer_can_read_but_only_writer_can_decide_and_audit_once(): void
    {
        $company = $this->company('Synthetic A');
        $other = $this->company('Synthetic B');
        $writer = $this->actor($company, 'writer', true);
        $reader = $this->actor($company, 'reader', false);
        $outsider = $this->actor($other, 'outsider', true);
        $review = app(SyntheticCommerceReview::class);

        $created = [];
        foreach (['shopify', 'woocommerce'] as $provider) {
            $warehouse = $this->fixtures($company, $provider);
            [$raw, $headers] = $this->signed($provider, $this->payload($provider));
            $created[$provider] = $this->send(
                $company->id, $writer->id, $provider, $raw, $headers, $warehouse);
        }
        $this->assertDatabaseCount('commerce_order_events', 2);
        $this->assertDatabaseCount('audit_logs', 2);

        $page = $review->list($company->id, $reader->id, limit: 1);
        $this->assertCount(1, $page['items']);
        $this->assertNotNull($page['next_cursor']);
        $this->assertTrue($page['items'][0]['demo_only']);
        $this->assertFalse($page['items'][0]['posting']);
        $this->assertArrayNotHasKey('normalized_json', $page['items'][0]);
        $this->assertArrayNotHasKey('customer', $page['items'][0]);
        $next = $review->list($company->id, $reader->id,
            afterId: $page['next_cursor'], limit: 1);
        $this->assertCount(1, $next['items']);
        $this->assertNull($next['next_cursor']);

        $this->rejects(fn () => $review->decide(
            $company->id, $reader->id, $created['shopify']['id'], 'reviewed'));
        $this->rejects(fn () => $review->list(
            $company->id, $outsider->id));
        $this->rejects(fn () => $review->decide(
            $other->id, $outsider->id, $created['shopify']['id'], 'reviewed'));

        $done = $review->decide(
            $company->id, $writer->id, $created['shopify']['id'], 'reviewed');
        $this->assertSame('reviewed', $done['status']);
        $this->assertFalse($done['posting']);
        $this->assertFalse($done['inventory_reserved']);
        $this->assertFalse($done['invoice_created']);
        $this->assertFalse($done['replayed']);
        $this->assertTrue($review->decide(
            $company->id, $writer->id, $created['shopify']['id'], 'reviewed')['replayed']);
        $this->rejects(fn () => $review->decide(
            $company->id, $writer->id, $created['shopify']['id'], 'hold'));
        $this->assertSame('hold', $review->decide(
            $company->id, $writer->id, $created['woocommerce']['id'], 'hold')['status']);

        $this->assertDatabaseCount('commerce_order_events', 2);
        $this->assertDatabaseCount('audit_logs', 4); // staging + one decision each
        $statuses = $review->list($company->id, $reader->id)['items'];
        $this->assertSame(['reviewed', 'hold'],
            array_column($statuses, 'status'));
        // A signed duplicate must preserve its actual held/reviewed disposition.
        [$raw, $headers] = $this->signed('shopify', $this->payload('shopify'));
        $warehouse = DB::table('warehouses')->where('company_id', $company->id)
            ->orderBy('id')->value('id');
        $this->assertSame('reviewed', $this->send(
            $company->id, $writer->id, 'shopify', $raw, $headers, $warehouse)['status']);
        $this->assertDatabaseCount('audit_logs', 4);
    }

    public function test_synthetic_commerce_review_rejects_tampering_and_audit_failure_rolls_back(): void
    {
        $company = $this->company('Synthetic A');
        $writer = $this->actor($company, 'writer', true);
        $warehouse = $this->fixtures($company, 'shopify');
        [$raw, $headers] = $this->signed('shopify', $this->payload('shopify'));
        $created = $this->send(
            $company->id, $writer->id, 'shopify', $raw, $headers, $warehouse);
        $review = app(SyntheticCommerceReview::class);
        $this->rejects(fn () => $review->decide(
            $company->id, $writer->id, $created['id'], 'approved'));
        $this->rejects(fn () => $review->list($company->id, $writer->id, limit: 200));
        $this->assertDatabaseCount('audit_logs', 1);

        // Deliberately fail the audit insert inside a single SQLite test
        // transaction: the review status must remain unchanged.
        Schema::drop('audit_logs');
        try {
            $review->decide($company->id, $writer->id, $created['id'], 'hold');
            $this->fail('Missing audit table must reject synthetic review.');
        } catch (\Illuminate\Database\QueryException) {
            $this->assertDatabaseHas('commerce_order_events', [
                'id' => $created['id'], 'company_id' => $company->id,
                'status' => 'review',
            ]);
        }
        DB::table('commerce_order_events')->where('id', $created['id'])
            ->update(['fingerprint' => str_repeat('0', 64)]);
        $this->rejects(fn () => $review->list($company->id, $writer->id));
        $this->rejects(fn () => $review->decide(
            $company->id, $writer->id, $created['id'], 'reviewed'));
    }

    public function test_synthetic_commerce_review_flag_blocks_read_and_write_even_with_membership(): void
    {
        $company = $this->company('Synthetic A');
        $writer = $this->actor($company, 'writer', true);
        $review = app(SyntheticCommerceReview::class);
        config()->set('finai.synthetic_commerce_staging_enabled', false);
        $this->rejects(fn () => $review->list($company->id, $writer->id));
        $this->rejects(fn () => $review->decide(
            $company->id, $writer->id, 1, 'hold'));
        $this->assertDatabaseCount('commerce_order_events', 0);
    }


    public function test_local_synthetic_review_http_ui_requires_session_read_and_write_role(): void
    {
        $company = $this->company('Synthetic A');
        $foreign = $this->company('Synthetic B');
        $writer = $this->actor($company, 'writer', true);
        $reader = $this->actor($company, 'reader', false);
        $outsider = $this->actor($foreign, 'outsider', true);
        $warehouse = $this->fixtures($company, 'shopify');
        [$raw, $headers] = $this->signed('shopify', $this->payload('shopify'));
        $staged = $this->send(
            $company->id, $writer->id, 'shopify', $raw, $headers, $warehouse);
        $url = '/api/companies/'.$company->id.'/demo/commerce-review';

        $this->getJson($url)->assertUnauthorized();
        $this->postJson($url.'/'.$staged['id'].'/decision', [
            'decision' => 'reviewed',
        ])->assertUnauthorized();

        $this->actingAs($reader);
        $this->getJson($url)->assertOk()
            ->assertJsonPath('data.items.0.status', 'review')
            ->assertJsonPath('data.items.0.demo_only', true)
            ->assertJsonPath('data.items.0.posting', false)
            ->assertJsonMissingPath('data.items.0.normalized_json');
        $this->postJson($url.'/'.$staged['id'].'/decision', [
            'decision' => 'reviewed',
        ])->assertForbidden();
        $this->assertDatabaseCount('audit_logs', 1);

        $this->actingAs($outsider);
        $this->getJson($url)->assertForbidden();
        $this->postJson($url.'/'.$staged['id'].'/decision', [
            'decision' => 'hold',
        ])->assertForbidden();

        $this->actingAs($writer);
        $this->getJson($url.'?after_id=-1')->assertUnprocessable();
        $this->postJson($url.'/'.$staged['id'].'/decision', [
            'decision' => 'posted',
        ])->assertUnprocessable();
        $this->postJson($url.'/'.$staged['id'].'/decision', [
            'decision' => 'reviewed',
        ])->assertOk()
            ->assertJsonPath('data.status', 'reviewed')
            ->assertJsonPath('data.posting', false)
            ->assertJsonPath('data.invoice_created', false);
        $this->postJson($url.'/'.$staged['id'].'/decision', [
            'decision' => 'reviewed',
        ])->assertOk()->assertJsonPath('data.replayed', true);
        $this->postJson($url.'/'.$staged['id'].'/decision', [
            'decision' => 'hold',
        ])->assertStatus(409);
        $this->getJson($url)->assertOk()
            ->assertJsonPath('data.items.0.status', 'reviewed');
        $this->assertDatabaseCount('commerce_order_events', 1);
        $this->assertDatabaseCount('audit_logs', 2);

        config()->set('finai.synthetic_commerce_staging_enabled', false);
        $this->getJson($url)->assertNotFound();
        $this->postJson($url.'/'.$staged['id'].'/decision', [
            'decision' => 'reviewed',
        ])->assertNotFound();
        config()->set('finai.synthetic_commerce_staging_enabled', true);
        app()->instance('env', 'production');
        $this->getJson($url)->assertNotFound();
        $this->postJson($url.'/'.$staged['id'].'/decision', [
            'decision' => 'reviewed',
        ])->assertNotFound();
    }


}
