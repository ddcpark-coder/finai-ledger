<?php

namespace App\Application\Accounting;

use App\Domain\Accounting\SyntheticScenarioRules as Rules;
use Illuminate\Support\Facades\DB;

final class SyntheticLedgerScenario
{
    private function rowToState(?object $row): array
    {
        if (! $row) return Rules::initial();
        return [
            'state' => $row->state,
            'version' => (int) $row->version,
            'on_hand' => (int) $row->stock_on_hand,
            'reserved' => (int) $row->stock_reserved,
            'dispatched' => (int) $row->stock_dispatched,
        ];
    }

    private function result(int $companyId, int $userId, ?object $scenario, bool $replayed = false): array
    {
        $state = $this->rowToState($scenario);
        Rules::assertStock($state);
        $events = $scenario
            ? DB::table('synthetic_ledger_events')->where('scenario_id', $scenario->id)
                ->where('company_id', $companyId)->where('user_id', $userId)
                ->orderBy('version')->get(['client_event_id', 'action', 'version',
                    'journal_lines', 'stock_movement'])
                ->map(static fn ($event) => [
                    'event_id' => $event->client_event_id,
                    'action' => $event->action,
                    'version' => (int) $event->version,
                    'journal_lines' => json_decode($event->journal_lines, true, 512, JSON_THROW_ON_ERROR),
                    'stock_movement' => json_decode($event->stock_movement, true, 512, JSON_THROW_ON_ERROR),
                ])->all()
            : [];
        return [
            'company_id' => $companyId,
            'demo_only' => true, 'real_posting_enabled' => false,
            'state' => $state['state'], 'version' => $state['version'],
            'inventory' => [
                'sku' => 'SYNTH-SKU-001', 'on_hand' => $state['on_hand'],
                'reserved' => $state['reserved'], 'dispatched' => $state['dispatched'],
                'order_quantity' => Rules::ORDER_QUANTITY,
            ],
            'invoice' => [
                'net_cents' => Rules::NET_CENTS,
                'vat_cents' => Rules::VAT_CENTS,
                'gross_cents' => Rules::GROSS_CENTS,
                'currency' => 'EUR',
            ],
            'events' => $events, 'replayed' => $replayed,
        ];
    }

    public function show(int $companyId, int $userId): array
    {
        $row = DB::table('synthetic_ledger_scenarios')
            ->where('company_id', $companyId)->where('user_id', $userId)->first();
        return $this->result($companyId, $userId, $row);
    }

    public function apply(int $companyId, int $userId, string $action,
        string $eventId, int $expectedVersion): array
    {
        return DB::transaction(function () use ($companyId, $userId, $action,
            $eventId, $expectedVersion): array {
            // Serialize first-ever scenario creation and protect the unique (company,user).
            $company = DB::table('companies')->where('id', $companyId)
                ->where('active', true)->lockForUpdate()->first();
            abort_unless($company, 404);

            $query = DB::table('synthetic_ledger_scenarios')
                ->where('company_id', $companyId)->where('user_id', $userId);
            $scenario = (clone $query)->lockForUpdate()->first();

            if ($scenario) {
                $prior = DB::table('synthetic_ledger_events')
                    ->where('scenario_id', $scenario->id)
                    ->where('client_event_id', $eventId)
                    ->lockForUpdate()->first();
                if ($prior) {
                    abort_unless($prior->action === $action
                        && (int) $prior->version === $expectedVersion + 1, 409,
                        'The synthetic event ID was already used differently.');
                    return $this->result($companyId, $userId, $scenario, true);
                }
            }

            $current = $this->rowToState($scenario);
            abort_unless($current['version'] === $expectedVersion, 409,
                'Stale synthetic scenario version.');
            try {
                $outcome = Rules::apply($current, $action);
            } catch (\DomainException $error) {
                abort(409, $error->getMessage());
            }
            $next = $outcome['next'];
            if (! $scenario) {
                $id = DB::table('synthetic_ledger_scenarios')->insertGetId([
                    'company_id' => $companyId, 'user_id' => $userId,
                    'state' => $next['state'], 'version' => $next['version'],
                    'stock_on_hand' => $next['on_hand'],
                    'stock_reserved' => $next['reserved'],
                    'stock_dispatched' => $next['dispatched'],
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            } else {
                $id = (int) $scenario->id;
                $changed = DB::table('synthetic_ledger_scenarios')
                    ->where('id', $id)->where('company_id', $companyId)
                    ->where('user_id', $userId)->where('version', $expectedVersion)
                    ->update([
                        'state' => $next['state'], 'version' => $next['version'],
                        'stock_on_hand' => $next['on_hand'],
                        'stock_reserved' => $next['reserved'],
                        'stock_dispatched' => $next['dispatched'],
                        'updated_at' => now(),
                    ]);
                abort_unless($changed === 1, 409, 'Concurrent synthetic edit rejected.');
            }

            DB::table('synthetic_ledger_events')->insert([
                'scenario_id' => $id, 'company_id' => $companyId, 'user_id' => $userId,
                'client_event_id' => $eventId, 'action' => $action,
                'version' => $next['version'],
                'journal_lines' => json_encode($outcome['journal_lines'], JSON_THROW_ON_ERROR),
                'stock_movement' => json_encode($outcome['stock_movement'], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id' => $companyId, 'actor_user_id' => $userId,
                'event_type' => 'synthetic_ledger.'.$action,
                'entity_type' => 'synthetic_ledger_scenario', 'entity_id' => (string) $id,
                'metadata' => json_encode([
                    'demo_only' => true, 'client_event_id' => $eventId,
                    'version' => $next['version'],
                    'stock' => $outcome['stock_movement'],
                    'journal_lines' => $outcome['journal_lines'],
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            // Deliberate failpoint only in isolated test process to prove full rollback.
            if (app()->environment('testing')
                && config('finai.synthetic_ledger_test_fail_after_event', false)) {
                throw new \RuntimeException('Synthetic rollback QA failpoint.');
            }

            $updated = DB::table('synthetic_ledger_scenarios')->find($id);
            return $this->result($companyId, $userId, $updated);
        }, 3);
    }
}
