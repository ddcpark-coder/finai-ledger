<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class SyntheticReceiptSyncTest extends TestCase
{
    private function company(string $name): Company
    {
        return Company::query()->create(['name' => $name, 'active' => true]);
    }

    private function member(Company $company, string $name, bool $writer = true): User
    {
        $user = User::query()->create([
            'name' => $name,
            'email' => strtolower($name) . '@example.test',
            'password' => 'dummy-testing-only-password',
            'active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $role = DB::table('roles')->insertGetId([
            'key' => 'viewer-' . $company->id . '-' . $user->id,
            'name' => 'Viewer',
            'system' => true,
        ]);
        if ($writer) {
            $permission = DB::table('permissions')->where('key', 'documents.write')->value('id');
            if (! $permission) {
                $permission = DB::table('permissions')->insertGetId([
                    'key' => 'documents.write', 'name' => 'Synthetic documents write',
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id' => $role, 'permission_id' => $permission,
            ]);
        }
        $user->companies()->attach($company->id, [
            'role_id' => $role,
            'status' => 'active',
            'joined_at' => now(),
        ]);
        return $user;
    }

    private function uri(Company $company, string $document = 'SYNTH-DOB-2026-0048'): string
    {
        return '/api/companies/' . $company->id . '/demo/sync-receipts/' . $document;
    }

    private function payload(int $companyId = 1, string $document = 'SYNTH-DOB-2026-0048',
        int $version = 0, string $id = '1069a8cb-93c6-4a6f-8a8c-5fb138f7a801'): array
    {
        return [
            'client_event_id' => $id,
            'expected_version' => $version,
            'envelope' => [
                'format' => 'finai-mobile-synthetic-vault-v1',
                'companyId' => $companyId,
                'documentId' => $document,
                'version' => 1,
                'iterations' => 250000,
                'salt' => 'AQIDBAUGBwgJCgsMDQ4PEA==',
                'iv' => 'AQIDBAUGBwgJCgsM',
                'ciphertext' => base64_encode(str_repeat('encrypted-test', 16)),
            ],
        ];
    }

    public function test_fail_closed_when_disabled_and_when_not_authenticated(): void
    {
        $a = $this->company('A');
        $this->postJson($this->uri($a), $this->payload($a->id))->assertUnauthorized();
        $user = $this->member($a, 'Alice');
        $this->actingAs($user);
        $this->postJson($this->uri($a), $this->payload($a->id))->assertNotFound();
        $this->getJson($this->uri($a))->assertNotFound();
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 0);
    }

    public function test_accepts_one_encrypted_synthetic_event_and_exact_replay_is_idempotent(): void
    {
        config()->set('finai.synthetic_receipt_sync_enabled', true);
        $a = $this->company('A');
        $this->actingAs($this->member($a, 'Alice'));
        $uri = $this->uri($a);
        $input = $this->payload($a->id);

        $this->getJson($uri)->assertOk()
            ->assertJsonPath('data.version', 0)
            ->assertJsonPath('data.real_sync_enabled', false);
        $this->postJson($uri, $input)->assertOk()
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.already_received', false)
            ->assertJsonPath('data.business_document_created', false);
        $this->postJson($uri, $input)->assertOk()
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.already_received', true);
        $this->getJson($uri)->assertOk()->assertJsonPath('data.version', 1);

        $this->assertDatabaseCount('synthetic_receipt_sync_events', 1);
        $this->assertDatabaseCount('audit_logs', 1);
        $row = DB::table('synthetic_receipt_sync_events')->first();
        $this->assertStringNotContainsString($input['envelope']['ciphertext'],
            $row->encrypted_envelope);
        $this->assertSame($input['envelope'],
            json_decode(Crypt::decryptString($row->encrypted_envelope), true));
    }

    public function test_conflict_is_rejected_and_never_overwrites_a_previous_envelope(): void
    {
        config()->set('finai.synthetic_receipt_sync_enabled', true);
        $a = $this->company('A');
        $this->actingAs($this->member($a, 'Alice'));
        $uri = $this->uri($a);
        $first = $this->payload($a->id);
        $this->postJson($uri, $first)->assertOk();
        $altered = $first;
        $altered['envelope']['ciphertext'] = base64_encode(str_repeat('different', 32));
        $this->postJson($uri, $altered)->assertStatus(409);
        $altered['client_event_id'] = '1069a8cb-93c6-4a6f-8a8c-5fb138f7a802';
        $this->postJson($uri, $altered)->assertStatus(409);
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 1);
        $this->assertDatabaseCount('audit_logs', 1);
        $altered['expected_version'] = 1;
        $this->postJson($uri, $altered)->assertOk()
            ->assertJsonPath('data.version', 2);
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 2);
    }

    public function test_company_and_user_isolation_and_invalid_payload(): void
    {
        config()->set('finai.synthetic_receipt_sync_enabled', true);
        $a = $this->company('A');
        $b = $this->company('B');
        $alice = $this->member($a, 'Alice');
        $bob = $this->member($b, 'Bob');

        $this->actingAs($alice);
        $this->postJson($this->uri($a), $this->payload($a->id))->assertOk();
        $this->getJson($this->uri($b, 'SYNTH-DOB-2026-B001'))->assertForbidden();
        $this->postJson($this->uri($b, 'SYNTH-DOB-2026-B001'),
            $this->payload($b->id, 'SYNTH-DOB-2026-B001'))->assertForbidden();
        $this->postJson($this->uri($a), $this->payload($b->id))->assertUnprocessable();

        $this->actingAs($bob);
        $this->getJson($this->uri($a))->assertForbidden();
        $this->getJson($this->uri($b, 'SYNTH-DOB-2026-B001'))->assertOk()
            ->assertJsonPath('data.version', 0);
        $this->postJson($this->uri($b, 'SYNTH-DOB-2026-B001'),
            $this->payload($b->id, 'SYNTH-DOB-2026-B001'))->assertOk();
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 2);
    }

    public function test_second_device_can_read_only_latest_client_encrypted_envelope_without_plaintext(): void
    {
        config()->set('finai.synthetic_receipt_sync_enabled', true);
        $a = $this->company('A');
        $b = $this->company('B');
        $alice = $this->member($a, 'Alice');
        $bob = $this->member($a, 'Bob');
        $other = $this->member($b, 'Charlie');
        $url = $this->uri($a) . '/latest';

        $this->getJson($url)->assertUnauthorized();
        $this->actingAs($alice);
        $this->getJson($url)->assertOk()
            ->assertJsonPath('data.version', 0)
            ->assertJsonPath('data.envelope', null)
            ->assertJsonMissingPath('data.encrypted_envelope');

        $first = $this->payload($a->id);
        $this->postJson($this->uri($a), $first)->assertOk();
        $this->getJson($url)->assertOk()
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.envelope', $first['envelope'])
            ->assertJsonMissingPath('data.encrypted_envelope');

        $second = $first;
        $second['client_event_id'] = '1069a8cb-93c6-4a6f-8a8c-5fb138f7a803';
        $second['expected_version'] = 1;
        $second['envelope']['ciphertext'] = base64_encode(str_repeat('new-version', 32));
        $this->postJson($this->uri($a), $second)->assertOk();
        $this->getJson($url)->assertOk()
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.envelope', $second['envelope']);

        $this->actingAs($bob);
        $this->getJson($url)->assertOk()
            ->assertJsonPath('data.version', 0)
            ->assertJsonPath('data.envelope', null);

        $this->actingAs($other);
        $this->getJson($url)->assertForbidden();

        $this->actingAs($alice);
        $this->getJson($this->uri($b, 'SYNTH-DOB-2026-B001') . '/latest')
            ->assertForbidden();
        $this->getJson($this->uri($a, 'REAL-DOC-1') . '/latest')
            ->assertNotFound();
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 2);
    }

    public function test_unknown_document_bad_envelope_and_suspended_member_are_rejected(): void
    {
        config()->set('finai.synthetic_receipt_sync_enabled', true);
        $a = $this->company('A');
        $alice = $this->member($a, 'Alice');
        $this->actingAs($alice);
        $uri = $this->uri($a);
        $this->getJson($this->uri($a, 'REAL-DOC-0001'))->assertNotFound();
        foreach ([
            ['client_event_id' => 'not-a-uuid'],
            ['envelope' => ['ciphertext' => 'bad']],
            ['envelope' => [...$this->payload($a->id)['envelope'], 'extra' => 'secret']],
            ['expected_version' => -1],
        ] as $bad) {
            $this->postJson($uri, [...$this->payload($a->id), ...$bad])
                ->assertUnprocessable();
        }
        DB::table('company_user')->where('company_id', $a->id)
            ->where('user_id', $alice->id)->update(['status' => 'suspended']);
        $this->postJson($uri, $this->payload($a->id))->assertForbidden();
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 0);
    }

    public function test_verified_member_without_documents_write_can_only_read_own_synthetic_sync(): void
    {
        config()->set('finai.synthetic_receipt_sync_enabled', true);
        $company = $this->company('A');
        $reader = $this->member($company, 'Reader', writer: false);
        $writer = $this->member($company, 'Writer');
        $url = $this->uri($company);

        $this->actingAs($reader);
        $this->getJson($url)->assertOk()->assertJsonPath('data.version', 0);
        $this->getJson($url.'/latest')->assertOk()
            ->assertJsonPath('data.envelope', null);
        $this->postJson($url, $this->payload($company->id))->assertForbidden();
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 0);
        $this->assertDatabaseCount('audit_logs', 0);

        $this->actingAs($writer);
        $this->postJson($url, $this->payload($company->id))->assertOk()
            ->assertJsonPath('data.demo_only', true);
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 1);

        // A different member of the same company cannot fetch the writer's
        // private client-encrypted event by guessing the company or document.
        $this->actingAs($reader);
        $this->getJson($url.'/latest')->assertOk()
            ->assertJsonPath('data.envelope', null);
        $this->getJson($url)->assertOk()->assertJsonPath('data.version', 0);
    }

    public function test_documents_write_revocation_is_checked_on_each_upload_and_failed_write_is_not_audited(): void
    {
        config()->set('finai.synthetic_receipt_sync_enabled', true);
        $company = $this->company('A');
        $writer = $this->member($company, 'Writer');
        $this->actingAs($writer);
        $url = $this->uri($company);
        $this->postJson($url, $this->payload($company->id))->assertOk();
        $this->assertDatabaseCount('audit_logs', 1);

        $role = DB::table('company_user')->where('user_id', $writer->id)
            ->where('company_id', $company->id)->value('role_id');
        DB::table('permission_role')->where('role_id', $role)->delete();
        $this->postJson($url, $this->payload($company->id, version: 1,
            id: '1069a8cb-93c6-4a6f-8a8c-5fb138f7a802'))->assertForbidden();
        $this->getJson($url)->assertOk()->assertJsonPath('data.version', 1);
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 1);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_unverified_and_suspended_member_are_denied_for_synthetic_sync(): void
    {
        config()->set('finai.synthetic_receipt_sync_enabled', true);
        $company = $this->company('A');
        $writer = $this->member($company, 'Writer');
        $this->actingAs($writer);
        $url = $this->uri($company);

        $writer->forceFill(['email_verified_at' => null])->save();
        $this->postJson($url, $this->payload($company->id))->assertForbidden();
        $this->getJson($url)->assertForbidden();
        $writer->forceFill(['email_verified_at' => now()])->save();

        DB::table('company_user')->where('user_id', $writer->id)
            ->where('company_id', $company->id)->update(['status' => 'suspended']);
        $this->postJson($url, $this->payload($company->id))->assertForbidden();
        $this->getJson($url)->assertForbidden();
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_prod_environment_always_disables_synthetic_upload_even_with_feature_flag(): void
    {
        config()->set('finai.synthetic_receipt_sync_enabled', true);
        $company = $this->company('A');
        $writer = $this->member($company, 'Writer');
        $this->actingAs($writer);
        app()->instance('env', 'production');
        $url = $this->uri($company);
        $this->postJson($url, $this->payload($company->id))->assertNotFound();
        $this->getJson($url)->assertNotFound();
        $this->assertDatabaseCount('synthetic_receipt_sync_events', 0);
    }

}
