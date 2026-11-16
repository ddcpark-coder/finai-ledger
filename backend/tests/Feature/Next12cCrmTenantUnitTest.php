<?php

namespace Tests\Feature;

use App\Application\CRM\AssignOpportunityBusinessUnit;
use App\Application\CRM\ConvertLeadToOpportunity;
use App\Application\CRM\GetNextActions;
use App\Application\CRM\GetSalesPipeline;
use App\Application\CRM\MoveOpportunityStage;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class Next12cCrmTenantUnitTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Only isolated SQLite :memory:, never production migrations/records.
        Schema::create('warehouses', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
            $t->boolean('active')->default(true);
        });
        Schema::create('partners', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
        });
        Schema::create('crm_contacts', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
            $t->unsignedBigInteger('partner_id')->nullable();
        });
        Schema::create('crm_leads', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
            $t->unsignedBigInteger('partner_id')->nullable();
            $t->unsignedBigInteger('contact_id')->nullable();
            $t->unsignedBigInteger('owner_user_id')->nullable();
            $t->string('name'); $t->string('status')->default('new');
            $t->decimal('estimated_value', 18, 2)->nullable();
            $t->string('currency', 3)->default('EUR');
            $t->timestamps();
        });
        Schema::create('crm_opportunities', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
            $t->unsignedBigInteger('lead_id')->nullable();
            $t->unsignedBigInteger('partner_id')->nullable();
            $t->unsignedBigInteger('contact_id')->nullable();
            $t->unsignedBigInteger('owner_user_id')->nullable();
            $t->string('name'); $t->string('stage')->default('qualification');
            $t->unsignedTinyInteger('probability_percent')->default(10);
            $t->decimal('value', 18, 2)->default(0);
            $t->string('currency', 3)->default('EUR');
            $t->timestamps();
        });
        Schema::create('crm_activities', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
            $t->unsignedBigInteger('assigned_to');
            $t->string('type')->default('task');
            $t->string('subject');
            $t->unsignedBigInteger('partner_id')->nullable();
            $t->unsignedBigInteger('lead_id')->nullable();
            $t->unsignedBigInteger('opportunity_id')->nullable();
            $t->dateTime('due_at')->nullable();
            $t->string('status')->default('open');
            $t->timestamps();
        });
        foreach ([
            '2026_11_14_000023_create_business_units_and_commerce_inbox.php',
            '2026_11_16_000025_create_crm_opportunity_business_units.php',
        ] as $migration) {
            $this->artisan('migrate', [
                '--path' => 'database/migrations/'.$migration,
                '--force' => true,
            ])->run();
        }
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name' => $name, 'active' => true]);
    }

    private function actor(Company $company, string $name, array $permissions): User
    {
        $user = User::query()->create([
            'name' => $name,
            'email' => strtolower($name).'@example.test',
            'password' => 'never-a-real-login-secret', 'active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $roleId = DB::table('roles')->insertGetId([
            'key' => 'next12c-'.$user->id, 'name' => 'Isolated CRM QA',
            'system' => true,
        ]);
        foreach ($permissions as $permission) {
            $permissionId = DB::table('permissions')->where('key', $permission)->value('id');
            if (! $permissionId) {
                $permissionId = DB::table('permissions')->insertGetId([
                    'key' => $permission, 'name' => $permission,
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id' => $roleId, 'permission_id' => $permissionId,
            ]);
        }
        $user->companies()->attach($company->id, [
            'role_id' => $roleId, 'status' => 'active', 'joined_at' => now(),
        ]);
        return $user;
    }

    private function unit(Company $company, string $code): int
    {
        return DB::table('business_units')->insertGetId([
            'company_id' => $company->id, 'code' => $code,
            'name' => 'Synthetic '.$code, 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function partner(Company $company): int
    {
        return DB::table('partners')->insertGetId(['company_id' => $company->id]);
    }

    private function contact(Company $company, ?int $partnerId): int
    {
        return DB::table('crm_contacts')->insertGetId([
            'company_id' => $company->id, 'partner_id' => $partnerId,
        ]);
    }

    private function lead(Company $company, User $owner, ?int $partnerId = null,
        ?int $contactId = null): int
    {
        return DB::table('crm_leads')->insertGetId([
            'company_id' => $company->id, 'owner_user_id' => $owner->id,
            'partner_id' => $partnerId, 'contact_id' => $contactId,
            'name' => 'Sinteticni posel', 'status' => 'new',
            'estimated_value' => '1234.50', 'currency' => 'EUR',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function opportunity(Company $company, User $owner): int
    {
        return DB::table('crm_opportunities')->insertGetId([
            'company_id' => $company->id, 'owner_user_id' => $owner->id,
            'name' => 'Sinteticna priloznost', 'stage' => 'qualification',
            'probability_percent' => 10, 'value' => '1250.00', 'currency' => 'EUR',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function rejects(callable $work): void
    {
        try {
            $work();
            $this->fail('Expected company CRM operation to be rejected.');
        } catch (\DomainException $error) {
            $this->assertNotSame('', $error->getMessage());
        }
    }

    public function test_unit_assignment_enforces_company_permissions_and_idempotency(): void
    {
        $a = $this->company('Company A'); $b = $this->company('Company B');
        $alice = $this->actor($a, 'alice', ['crm.write']);
        $viewer = $this->actor($a, 'viewer', ['crm.read']);
        $bob = $this->actor($b, 'bob', ['crm.write']);
        $aUnit = $this->unit($a, 'PE-01');
        $bUnit = $this->unit($b, 'PE-02');
        $dealA = $this->opportunity($a, $alice);
        $dealB = $this->opportunity($b, $bob);
        $assign = app(AssignOpportunityBusinessUnit::class);

        $this->assertTrue($assign->execute($a->id, $alice->id, $dealA, $aUnit));
        $this->assertFalse($assign->execute($a->id, $alice->id, $dealA, $aUnit));
        $this->rejects(fn () => $assign->execute($a->id, $alice->id, $dealA, $bUnit));
        $this->rejects(fn () => $assign->execute($a->id, $alice->id, $dealB, $aUnit));
        $this->rejects(fn () => $assign->execute($a->id, $viewer->id, $dealA, $aUnit));
        $this->rejects(fn () => $assign->execute($a->id, $bob->id, $dealA, $aUnit));
        $this->assertDatabaseCount('crm_opportunity_business_units', 1);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_lead_conversion_checks_foreign_references_and_atomic_audit(): void
    {
        $a = $this->company('Company A'); $b = $this->company('Company B');
        $alice = $this->actor($a, 'alice', ['crm.write']);
        $bob = $this->actor($b, 'bob', ['crm.write']);
        $unitA = $this->unit($a, 'PE-01'); $unitB = $this->unit($b, 'PE-02');
        $partnerA = $this->partner($a); $partnerB = $this->partner($b);
        $contactA = $this->contact($a, $partnerA);
        $contactB = $this->contact($b, $partnerB);
        $convert = app(ConvertLeadToOpportunity::class);
        $foreign = $this->lead($a, $alice, $partnerB, $contactB);
        $this->rejects(fn () => $convert->execute($a->id, $foreign, $alice->id));
        $this->rejects(fn () => $convert->execute($a->id, $foreign, $bob->id));

        $valid = $this->lead($a, $alice, $partnerA, $contactA);
        $this->rejects(fn () => $convert->execute($b->id, $valid, $bob->id));
        $this->rejects(fn () => $convert->execute($a->id, $valid, $alice->id, $unitB));
        $id = $convert->execute($a->id, $valid, $alice->id, $unitA);
        $this->assertDatabaseHas('crm_opportunities', [
            'id' => $id, 'company_id' => $a->id,
            'partner_id' => $partnerA, 'contact_id' => $contactA,
            'stage' => 'qualification',
        ]);
        $this->assertDatabaseHas('crm_opportunity_business_units', [
            'opportunity_id' => $id, 'company_id' => $a->id,
            'business_unit_id' => $unitA,
        ]);
        $this->rejects(fn () => $convert->execute($a->id, $valid, $alice->id, $unitA));
        $this->assertDatabaseCount('crm_opportunities', 1);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_stage_transitions_are_sequential_audited_and_scoped(): void
    {
        $a = $this->company('Company A'); $b = $this->company('Company B');
        $alice = $this->actor($a, 'alice', ['crm.write']);
        $viewer = $this->actor($a, 'viewer', ['crm.read']);
        $bob = $this->actor($b, 'bob', ['crm.write']);
        $unitA = $this->unit($a, 'PE-01');
        $unitB = $this->unit($b, 'PE-02');
        $deal = $this->opportunity($a, $alice);
        $move = app(MoveOpportunityStage::class);
        $this->rejects(fn () => $move->execute($b->id, $deal, 'discovery', $bob->id));
        $this->rejects(fn () => $move->execute($a->id, $deal, 'proposal', $alice->id));
        $this->rejects(fn () => $move->execute($a->id, $deal, 'discovery', $viewer->id));
        app(AssignOpportunityBusinessUnit::class)->execute($a->id, $alice->id, $deal, $unitA);
        $this->rejects(fn () => $move->execute($a->id, $deal, 'discovery', $alice->id, $unitB));
        $move->execute($a->id, $deal, 'discovery', $alice->id, $unitA);
        $this->assertDatabaseHas('crm_opportunities', [
            'id' => $deal, 'company_id' => $a->id,
            'stage' => 'discovery', 'probability_percent' => 30,
        ]);
        $this->rejects(fn () => $move->execute($a->id, $deal, 'discovery', $alice->id));
        $move->execute($a->id, $deal, 'lost', $alice->id, $unitA);
        $this->rejects(fn () => $move->execute($a->id, $deal, 'won', $alice->id));
        $this->assertDatabaseCount('audit_logs', 3);
    }

    public function test_pipeline_and_actions_only_read_authorized_company_and_unit(): void
    {
        $a = $this->company('Company A'); $b = $this->company('Company B');
        $alice = $this->actor($a, 'alice', ['crm.read','crm.write']);
        $reader = $this->actor($a, 'reader', []);
        $bob = $this->actor($b, 'bob', ['crm.read','crm.write']);
        $unitA = $this->unit($a, 'PE-01'); $unitB = $this->unit($b, 'PE-02');
        $dealA = $this->opportunity($a, $alice);
        $dealB = $this->opportunity($b, $bob);
        app(AssignOpportunityBusinessUnit::class)->execute($a->id, $alice->id, $dealA, $unitA);
        app(AssignOpportunityBusinessUnit::class)->execute($b->id, $bob->id, $dealB, $unitB);
        DB::table('crm_activities')->insert([
            ['company_id' => $a->id, 'assigned_to' => $alice->id, 'subject' => 'Demo A',
                'due_at' => '2026-12-01', 'status' => 'open', 'created_at' => now(), 'updated_at' => now()],
            ['company_id' => $b->id, 'assigned_to' => $bob->id, 'subject' => 'Demo B',
                'due_at' => '2026-12-02', 'status' => 'open', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $pipeline = app(GetSalesPipeline::class);
        $this->assertSame(1, $pipeline->execute($a->id, $alice->id, businessUnitId: $unitA)[0]['opportunity_count']);
        $this->assertSame(1, $pipeline->execute($b->id, $bob->id, businessUnitId: $unitB)[0]['opportunity_count']);
        $this->rejects(fn () => $pipeline->execute($a->id, $bob->id));
        $this->rejects(fn () => $pipeline->execute($a->id, $reader->id));
        $this->rejects(fn () => $pipeline->execute($a->id, $alice->id, businessUnitId: $unitB));
        $this->assertCount(1, app(GetNextActions::class)->execute($a->id, $alice->id));
        $this->assertCount(1, app(GetNextActions::class)->execute($b->id, $bob->id));
        $this->rejects(fn () => app(GetNextActions::class)->execute($a->id, $bob->id));
    }

    public function test_audit_write_failure_rolls_back_conversion_and_assignment(): void
    {
        $a = $this->company('Company A');
        $alice = $this->actor($a, 'alice', ['crm.write']);
        $unit = $this->unit($a, 'PE-01');
        $lead = $this->lead($a, $alice);
        $deal = $this->opportunity($a, $alice);
        Schema::drop('audit_logs'); // Only test DB exists.
        try {
            app(ConvertLeadToOpportunity::class)->execute($a->id, $lead, $alice->id, $unit);
            $this->fail('Missing audit should roll back lead conversion.');
        } catch (\Illuminate\Database\QueryException $error) {
            $this->assertDatabaseHas('crm_leads', ['id' => $lead, 'status' => 'new']);
            $this->assertDatabaseCount('crm_opportunities', 1);
        }
        try {
            app(AssignOpportunityBusinessUnit::class)->execute($a->id, $alice->id, $deal, $unit);
            $this->fail('Missing audit should roll back assignment.');
        } catch (\Illuminate\Database\QueryException $error) {
            $this->assertDatabaseCount('crm_opportunity_business_units', 0);
        }
        try {
            app(MoveOpportunityStage::class)->execute($a->id, $deal, 'discovery', $alice->id);
            $this->fail('Missing audit should roll back stage mutation.');
        } catch (\Illuminate\Database\QueryException $error) {
            $this->assertDatabaseHas('crm_opportunities', ['id' => $deal, 'stage' => 'qualification']);
        }
    }
}
