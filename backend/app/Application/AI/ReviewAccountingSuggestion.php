<?php

namespace App\Application\AI;

use Illuminate\Support\Facades\DB;

final class ReviewAccountingSuggestion
{
    public function execute(int $suggestionId, int $userId, string $decision, array $finalResult): void
    {
        if (! in_array($decision, ['accepted', 'modified', 'rejected'], true)) {
            throw new \DomainException('Unsupported AI review decision.');
        }

        DB::transaction(function () use ($suggestionId, $userId, $decision, $finalResult) {
            $suggestion = DB::table('ai_accounting_suggestions')->lockForUpdate()->find($suggestionId);
            if (! $suggestion || $suggestion->status !== 'proposed') {
                throw new \DomainException('AI suggestion is not available for review.');
            }

            DB::table('ai_accounting_suggestions')->where('id', $suggestionId)->update([
                'status' => $decision,
                'reviewed_by' => $userId,
                'reviewed_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('ai_learning_events')->insert([
                'company_id' => $suggestion->company_id,
                'partner_id' => $suggestion->partner_id,
                'incoming_invoice_id' => $suggestion->incoming_invoice_id,
                'event_type' => match ($decision) {
                    'accepted' => 'posting_accepted',
                    'modified' => 'posting_modified',
                    default => 'posting_rejected',
                },
                'features_json' => $suggestion->signals_json ?? '{}',
                'result_json' => json_encode($finalResult),
                'confidence' => $suggestion->confidence,
                'actor_user_id' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $suggestion->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'ai_suggestion.'.$decision,
                'entity_type' => 'ai_accounting_suggestion',
                'entity_id' => (string) $suggestionId,
                'metadata' => json_encode(['confidence' => $suggestion->confidence]),
                'created_at' => now(),
            ]);
        });
    }
}
