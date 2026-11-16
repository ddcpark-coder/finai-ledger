<?php

namespace App\Application\Integrations;

use Illuminate\Support\Facades\DB;

/**
 * Synthetic local/testing-only commerce review desk. NO public API, paid order,
 * inventory reservation, invoice, accounting journal or provider callback.
 * Every read/write requires the caller's active company-scoped permission.
 */
final class SyntheticCommerceReview
{
    private static function assertTestMode(): void
    {
        if (! app()->environment('local', 'testing') ||
            ! config('finai.synthetic_commerce_staging_enabled', false)) {
            throw new \DomainException('Synthetic commerce review is disabled.');
        }
    }

    /**
     * Cursor-paginated, strictly PII-free company review summary.
     * No raw provider body, customer details, tokens or freeform notes.
     */
    public function list(int $companyId, int $actorId, int $afterId = 0,
        int $limit = 20): array
    {
        self::assertTestMode();
        if ($companyId < 1 || $afterId < 0 || $limit < 1 || $limit > 50) {
            throw new \DomainException('Invalid synthetic commerce review pagination.');
        }
        CompanyWorkflowAccess::requirePermission($companyId, $actorId, 'orders.read');

        $rows = DB::table('commerce_order_events')
            ->where('company_id', $companyId)
            ->where('id', '>', $afterId)
            ->orderBy('id')
            ->limit($limit + 1)
            ->get();
        $items = [];
        foreach ($rows->take($limit) as $row) {
            $normalized = self::verifyRow($row);
            $items[] = [
                'id' => (int) $row->id,
                'external_order_id' => $row->external_order_id,
                'provider' => $normalized['provider'],
                'warehouse_id' => $normalized['warehouse_id'],
                'total_cents' => $normalized['total_cents'],
                'line_count' => count($normalized['lines']),
                'status' => $row->status,
                'demo_only' => true,
                'posting' => false,
            ];
        }
        return [
            'items' => $items,
            'next_cursor' => $rows->count() > $limit && count($items) > 0
                ? $items[count($items) - 1]['id'] : null,
            'demo_only' => true,
            'real_sync_enabled' => false,
        ];
    }

    /**
     * Two terminal demonstration decisions. Neither books revenue, reserves
     * stock, approves a real order nor emits an external provider callback.
     */
    public function decide(int $companyId, int $actorId, int $orderId,
        string $decision): array
    {
        self::assertTestMode();
        if ($companyId < 1 || $orderId < 1 ||
            ! in_array($decision, ['reviewed', 'hold'], true)) {
            throw new \DomainException('Invalid synthetic review decision.');
        }
        return DB::transaction(function () use ($companyId, $actorId, $orderId,
            $decision): array {
            CompanyWorkflowAccess::requirePermission($companyId, $actorId, 'orders.write');
            $row = DB::table('commerce_order_events')
                ->where('company_id', $companyId)
                ->where('id', $orderId)
                ->lockForUpdate()
                ->first();
            if (! $row) {
                throw new \DomainException('Unknown company synthetic order.');
            }
            self::verifyRow($row);
            if ($row->status === $decision) {
                return self::decisionResult($orderId, $decision, true);
            }
            if ($row->status !== 'review') {
                throw new \DomainException('Synthetic review decision is already final.');
            }
            $changed = DB::table('commerce_order_events')
                ->where('company_id', $companyId)
                ->where('id', $orderId)
                ->where('status', 'review')
                ->update(['status' => $decision, 'updated_at' => now()]);
            if ($changed !== 1) {
                throw new \DomainException('Concurrent synthetic review decision conflict.');
            }
            DB::table('audit_logs')->insert([
                'company_id' => $companyId,
                'actor_user_id' => $actorId,
                'event_type' => 'synthetic_commerce_order.review_decided',
                'entity_type' => 'commerce_order_event',
                'entity_id' => (string) $orderId,
                'metadata' => json_encode([
                    'demo_only' => true, 'decision' => $decision,
                    'fingerprint' => $row->fingerprint,
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            return self::decisionResult($orderId, $decision, false);
        }, 3);
    }

    private static function decisionResult(int $orderId, string $status,
        bool $replayed): array
    {
        return [
            'id' => $orderId, 'status' => $status, 'replayed' => $replayed,
            'demo_only' => true, 'posting' => false,
            'inventory_reserved' => false, 'invoice_created' => false,
        ];
    }

    private static function verifyRow(object $row): array
    {
        if (! is_string($row->normalized_json) ||
            ! is_string($row->fingerprint) ||
            ! hash_equals($row->fingerprint,
                hash('sha256', $row->normalized_json))) {
            throw new \DomainException('Synthetic commerce review data integrity failed.');
        }
        try {
            $normalized = json_decode($row->normalized_json, true, 16,
                JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new \DomainException('Invalid synthetic commerce review row.');
        }
        if (! is_array($normalized) ||
            $normalized['demo_only'] ?? null !== true) {
            // handled by the exact schema + checks below, deliberately fail-closed
        }
        $keys = array_keys(is_array($normalized) ? $normalized : []);
        sort($keys);
        $expected = [
            'currency', 'demo_only', 'lines', 'posting', 'provider',
            'status', 'total_cents', 'warehouse_id',
        ];
        sort($expected);
        if ($keys !== $expected ||
            ($normalized['demo_only'] ?? null) !== true ||
            ($normalized['posting'] ?? null) !== false ||
            ($normalized['status'] ?? null) !== 'review' ||
            ! in_array($normalized['provider'] ?? null,
                ['woocommerce', 'shopify'], true) ||
            ($normalized['currency'] ?? null) !== 'EUR' ||
            ! is_int($normalized['total_cents'] ?? null) ||
            $normalized['total_cents'] < 1 ||
            ! is_int($normalized['warehouse_id'] ?? null) ||
            $normalized['warehouse_id'] < 1 ||
            ! is_array($normalized['lines'] ?? null) ||
            count($normalized['lines']) < 1 ||
            ! is_string($row->external_order_id) ||
            ! str_starts_with($row->external_order_id, 'SYN-') ||
            ! in_array($row->status, ['review', 'reviewed', 'hold'], true)) {
            throw new \DomainException('Review only accepts fully synthetic unposted orders.');
        }
        return $normalized;
    }
}
