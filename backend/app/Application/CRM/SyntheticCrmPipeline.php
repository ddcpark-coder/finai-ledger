<?php

namespace App\Application\CRM;

use App\Application\Integrations\CompanyWorkflowAccess;
use Illuminate\Support\Facades\DB;

final class SyntheticCrmPipeline
{
    private const STAGES = ['qualification', 'discovery', 'proposal', 'negotiation', 'won'];

    private function authorize(int $companyId, int $actorId, string $permission): void
    {
        // Never allow a synthetic CRM write (or readback) on a deployed instance.
        if (! app()->environment('local', 'testing')
            || ! config('finai.synthetic_crm_persistence_enabled', false)) {
            throw new \DomainException('Synthetic CRM persistence is disabled.');
        }
        CompanyWorkflowAccess::requirePermission($companyId, $actorId, $permission);
    }

    private function result(object $row): array
    {
        return [
            'demo_only' => true,
            'company_id' => (int) $row->company_id,
            'deal_id' => $row->deal_id,
            'unit_code' => $row->unit_code,
            'stage' => $row->stage,
            'value_cents' => (int) $row->value_cents,
            'version' => (int) $row->version,
        ];
    }

    private function scoped(int $companyId)
    {
        return DB::table('synthetic_crm_opportunities as deal')
            ->join('business_units as unit', 'unit.id', '=', 'deal.business_unit_id')
            ->where('deal.company_id', $companyId)
            ->where('unit.company_id', $companyId)
            ->where('unit.active', true);
    }

    public function list(int $companyId, int $actorId): array
    {
        $this->authorize($companyId, $actorId, 'crm.read');

        return $this->scoped($companyId)->orderBy('deal.id')->limit(100)->get([
            'deal.company_id', 'deal.deal_id', 'unit.code as unit_code',
            'deal.stage', 'deal.value_cents', 'deal.version',
        ])->map(fn (object $row): array => $this->result($row))->all();
    }

    public function register(int $companyId, int $actorId, array $input): array
    {
        $this->authorize($companyId, $actorId, 'crm.write');
        // Only deterministic, PII-free synthetic identifiers and integer cents.
        $expected = ['demoOnly', 'dealId', 'unitCode', 'initialStage', 'valueCents'];
        $keys = array_keys($input);
        sort($keys);
        sort($expected);
        if ($keys !== $expected || ($input['demoOnly'] ?? null) !== true
            || ! is_string($input['dealId'])
            || ! preg_match('/^SYN-CRM-[A-Z0-9-]{2,40}$/D', $input['dealId'])
            || ! is_string($input['unitCode'])
            || ! preg_match('/^[A-Z0-9-]{2,24}$/D', $input['unitCode'])
            || ! is_string($input['initialStage'])
            || ! in_array($input['initialStage'], self::STAGES, true)
            || ! is_int($input['valueCents'])
            || $input['valueCents'] < 1 || $input['valueCents'] > 10000000000) {
            throw new \DomainException('Invalid or non-synthetic CRM payload.');
        }

        return DB::transaction(function () use ($companyId, $actorId, $input): array {
            $unit = DB::table('business_units')
                ->where('company_id', $companyId)
                ->where('code', $input['unitCode'])
                ->where('active', true)->first();
            if (! $unit) {
                throw new \DomainException('Business unit does not belong to the company.');
            }

            $existing = $this->scoped($companyId)
                ->where('deal.deal_id', $input['dealId'])->lockForUpdate()
                ->first(['deal.*', 'unit.code as unit_code']);
            if ($existing) {
                if ((int) $existing->business_unit_id !== (int) $unit->id
                    || (int) $existing->value_cents !== $input['valueCents']
                    || $existing->initial_stage !== $input['initialStage']) {
                    throw new \DomainException('Synthetic CRM deal already exists with different data.');
                }
                // Replay never overwrites a later stage or version.
                return [...$this->result($existing), 'replayed' => true];
            }

            $id = DB::table('synthetic_crm_opportunities')->insertGetId([
                'company_id' => $companyId,
                'business_unit_id' => $unit->id,
                'created_by' => $actorId,
                'deal_id' => $input['dealId'],
                'stage' => $input['initialStage'],
                'initial_stage' => $input['initialStage'],
                'value_cents' => $input['valueCents'],
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id' => $companyId,
                'actor_user_id' => $actorId,
                'event_type' => 'synthetic_crm.opportunity_registered',
                'entity_type' => 'synthetic_crm_opportunity',
                'entity_id' => (string) $id,
                'metadata' => json_encode(['demo_only' => true,
                    'deal_id' => $input['dealId'],
                    'unit_code' => $input['unitCode']], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            return [
                'demo_only' => true, 'company_id' => $companyId,
                'deal_id' => $input['dealId'], 'unit_code' => $input['unitCode'],
                'stage' => $input['initialStage'], 'value_cents' => $input['valueCents'],
                'version' => 1, 'replayed' => false,
            ];
        }, 3);
    }

    public function advance(int $companyId, int $actorId, string $dealId,
        int $expectedVersion, string $nextStage): array
    {
        $this->authorize($companyId, $actorId, 'crm.write');
        if (! preg_match('/^SYN-CRM-[A-Z0-9-]{2,40}$/D', $dealId)
            || $expectedVersion < 1
            || ! in_array($nextStage, self::STAGES, true)) {
            throw new \DomainException('Invalid synthetic CRM transition.');
        }

        return DB::transaction(function () use ($companyId, $actorId, $dealId,
            $expectedVersion, $nextStage): array {
            $deal = $this->scoped($companyId)
                ->where('deal.deal_id', $dealId)->lockForUpdate()
                ->first(['deal.*', 'unit.code as unit_code']);
            if (! $deal) {
                throw new \DomainException('Synthetic CRM deal not found in this company.');
            }
            $index = array_search($deal->stage, self::STAGES, true);
            if ($index === false || $index === count(self::STAGES) - 1
                || self::STAGES[$index + 1] !== $nextStage
                || (int) $deal->version !== $expectedVersion) {
                throw new \DomainException('Invalid or stale CRM stage transition.');
            }

            $affected = DB::table('synthetic_crm_opportunities')
                ->where('id', $deal->id)->where('company_id', $companyId)
                ->where('version', $expectedVersion)->where('stage', $deal->stage)
                ->update(['stage' => $nextStage,
                    'version' => $expectedVersion + 1, 'updated_at' => now()]);
            if ($affected !== 1) {
                throw new \DomainException('Concurrent synthetic CRM stage change.');
            }
            DB::table('audit_logs')->insert([
                'company_id' => $companyId,
                'actor_user_id' => $actorId,
                'event_type' => 'synthetic_crm.stage_advanced',
                'entity_type' => 'synthetic_crm_opportunity',
                'entity_id' => (string) $deal->id,
                'metadata' => json_encode(['demo_only' => true,
                    'from' => $deal->stage, 'to' => $nextStage,
                    'version' => $expectedVersion + 1], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            return [
                ...$this->result($deal), 'stage' => $nextStage,
                'version' => $expectedVersion + 1,
            ];
        }, 3);
    }
}
