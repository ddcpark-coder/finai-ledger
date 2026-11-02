<?php

namespace App\Application\AI;

use App\Domain\AI\ConfidencePolicy;
use Illuminate\Support\Facades\DB;

final class BuildAccountingSuggestion
{
    public function execute(int $invoiceId): int
    {
        $invoice = DB::table('incoming_invoices')->find($invoiceId);
        if (! $invoice) {
            throw new \DomainException('Incoming invoice not found.');
        }

        $partner = $invoice->partner_id
            ? DB::table('partners')->find($invoice->partner_id)
            : null;

        $rules = DB::table('accounting_ai_rules')
            ->where('company_id', $invoice->company_id)
            ->where('active', true)
            ->where(function ($query) use ($invoice) {
                $query->whereNull('partner_id');
                if ($invoice->partner_id) {
                    $query->orWhere('partner_id', $invoice->partner_id);
                }
            })
            ->orderBy('priority')
            ->get();

        $history = DB::table('ai_learning_events')
            ->where('company_id', $invoice->company_id)
            ->when($invoice->partner_id, fn ($q) => $q->where('partner_id', $invoice->partner_id))
            ->where('event_type', 'posting_accepted')
            ->latest()
            ->limit(50)
            ->get();

        $signals = [
            'partner_history_count' => $history->count(),
            'rule_count' => $rules->count(),
            'partner_risk' => $partner?->risk_level ?? 'unknown',
            'extraction_confidence' => $invoice->extraction_confidence,
        ];

        $proposal = [
            'account_id' => null,
            'tax_code_id' => null,
            'cost_center_id' => null,
            'reason' => 'No deterministic rule matched yet.',
        ];

        $confidence = 55.0;

        foreach ($rules as $rule) {
            $conditions = json_decode($rule->conditions_json, true) ?? [];
            $action = json_decode($rule->action_json, true) ?? [];

            if ($this->matches($invoice, $conditions)) {
                $proposal = array_merge($proposal, $action);
                $proposal['reason'] = 'Matched accounting rule: '.$rule->rule_key;
                $confidence = min(99.5, 85 + min(14.5, $rule->times_accepted / 10));
                break;
            }
        }

        if ($history->count() >= 5 && $confidence < 90) {
            $confidence = min(94.0, $confidence + 12.0);
            $proposal['reason'] .= ' Reinforced by approved posting history.';
        }

        $riskLevel = ($partner?->risk_level && $partner->risk_level !== 'normal') ? 'review' : 'normal';
        $classification = ConfidencePolicy::classify($confidence, $riskLevel);

        return DB::table('ai_accounting_suggestions')->insertGetId([
            'company_id' => $invoice->company_id,
            'incoming_invoice_id' => $invoiceId,
            'partner_id' => $invoice->partner_id,
            'provider' => 'hybrid',
            'confidence' => $confidence,
            'risk_level' => $riskLevel,
            'suggestion_json' => json_encode($proposal),
            'explanation_json' => json_encode([
                'summary' => $proposal['reason'],
                'classification' => $classification,
                'deterministic_rules_checked' => $rules->count(),
                'approved_history_used' => $history->count(),
            ]),
            'signals_json' => json_encode($signals),
            'status' => 'proposed',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function matches(object $invoice, array $conditions): bool
    {
        foreach ($conditions as $field => $expected) {
            if (! property_exists($invoice, $field) || (string) $invoice->{$field} !== (string) $expected) {
                return false;
            }
        }

        return true;
    }
}
