<?php

namespace App\Application\Integrations;

use Illuminate\Support\Facades\DB;

/**
 * NEXT22: strict, company-scoped, synthetic-only relational read model and
 * warehouse PLANNING ledger. No changes to physical inventory or accounting.
 * Does not expose raw integration payloads, audit metadata or personal data.
 */
final class UnifiedSyntheticBusinessGraph
{
    private const AUDIT_TYPES = [
        'synthetic_commerce_order.staged',
        'synthetic_commerce_order.review_decided',
        'synthetic_crm.opportunity_registered',
        'synthetic_crm.stage_advanced',
        'synthetic_inventory.plan_recorded',
    ];

    private function enabled(): void
    {
        if (! app()->environment('local', 'testing') ||
            ! config('finai.synthetic_business_graph_enabled', false) ||
            ! config('finai.synthetic_commerce_staging_enabled', false) ||
            ! config('finai.synthetic_crm_persistence_enabled', false)) {
            throw new \DomainException('Unified synthetic business graph is disabled.');
        }
    }

    public static function reference(int $companyId, string $kind, int $id): string
    {
        if ($companyId < 1 || $id < 1 ||
            ! in_array($kind, ['order', 'crm', 'plan', 'audit'], true)) {
            throw new \DomainException('Invalid company-scoped business reference.');
        }

        return 'SYN:C'.$companyId.':'.strtoupper($kind).':'.$id;
    }

    /**
     * This persisted event is only a transfer PROPOSAL with explicit links
     * to an already staged PII-free order and a synthetic CRM opportunity.
     * It does not call PostInventoryMovement or create stock reservations.
     */
    public function recordPlan(int $companyId, int $actorId, array $input): array
    {
        $this->enabled();
        CompanyWorkflowAccess::requirePermission($companyId, $actorId, 'inventory.write');
        CompanyWorkflowAccess::requirePermission($companyId, $actorId, 'orders.read');
        CompanyWorkflowAccess::requirePermission($companyId, $actorId, 'crm.read');

        $expected = [
            'demoOnly', 'eventId', 'sourceWarehouseId', 'targetWarehouseId',
            'sku', 'quantity', 'commerceOrderId', 'crmDealId',
        ];
        $keys = array_keys($input);
        sort($keys);
        sort($expected);
        if ($keys !== $expected ||
            ($input['demoOnly'] ?? null) !== true ||
            ! is_string($input['eventId']) ||
            ! preg_match('/^SYN-PLAN-[A-Z0-9-]{2,65}$/D', $input['eventId']) ||
            ! is_string($input['sku']) ||
            ! preg_match('/^SYN-[A-Z0-9-]{2,60}$/D', $input['sku']) ||
            ! is_int($input['sourceWarehouseId']) ||
            ! is_int($input['targetWarehouseId']) ||
            $input['sourceWarehouseId'] < 1 ||
            $input['targetWarehouseId'] < 1 ||
            $input['sourceWarehouseId'] === $input['targetWarehouseId'] ||
            ! is_int($input['quantity']) ||
            $input['quantity'] < 1 || $input['quantity'] > 1000 ||
            ! is_int($input['commerceOrderId']) ||
            $input['commerceOrderId'] < 1 ||
            ! is_string($input['crmDealId']) ||
            ! preg_match('/^SYN-CRM-[A-Z0-9-]{2,40}$/D', $input['crmDealId'])) {
            throw new \DomainException('Invalid PII-free synthetic planning command.');
        }

        return DB::transaction(function () use ($companyId, $actorId, $input): array {
            // Check both warehouses and linked records inside the same transaction.
            foreach (['sourceWarehouseId', 'targetWarehouseId'] as $key) {
                if (! DB::table('warehouses')->where('id', $input[$key])
                    ->where('company_id', $companyId)->where('active', true)->exists()) {
                    throw new \DomainException('Warehouse outside this company.');
                }
            }
            $order = DB::table('commerce_order_events')
                ->where('id', $input['commerceOrderId'])
                ->where('company_id', $companyId)->lockForUpdate()->first();
            $deal = DB::table('synthetic_crm_opportunities as d')
                ->join('business_units as u', 'u.id', '=', 'd.business_unit_id')
                ->where('d.company_id', $companyId)
                ->where('u.company_id', $companyId)->where('u.active', true)
                ->where('d.deal_id', $input['crmDealId'])
                ->lockForUpdate()->first(['d.*']);
            if (! $order || ! $deal || ! is_string($order->normalized_json) ||
                ! is_string($order->fingerprint) ||
                ! hash_equals($order->fingerprint,
                    hash('sha256', $order->normalized_json))) {
                throw new \DomainException('Company order/CRM link is absent or invalid.');
            }
            try {
                $normalized = json_decode($order->normalized_json, true, 16, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                throw new \DomainException('Invalid PII-free order link.');
            }
            if (! is_array($normalized) || ($normalized['demo_only'] ?? null) !== true ||
                ($normalized['posting'] ?? null) !== false ||
                ($normalized['warehouse_id'] ?? null) !== $input['targetWarehouseId'] ||
                ! in_array($order->status, ['review', 'reviewed'], true) ||
                ! is_array($normalized['lines'] ?? null)) {
                throw new \DomainException('Only unposted and unheld company orders can be planned.');
            }
            $requested = 0;
            foreach ($normalized['lines'] as $line) {
                if (! is_array($line) || ! is_string($line['internal_sku'] ?? null) ||
                    ! is_int($line['quantity'] ?? null)) {
                    throw new \DomainException('Invalid synthetic order lines.');
                }
                if ($line['internal_sku'] === $input['sku']) {
                    $requested += $line['quantity'];
                }
            }
            if ($requested < $input['quantity']) {
                throw new \DomainException('Plan exceeds order SKU quantity.');
            }

            $canonical = self::canonical($companyId, $actorId, $input,
                (int) $deal->id);
            $fingerprint = hash('sha256', json_encode($canonical, JSON_THROW_ON_ERROR));
            $prior = DB::table('synthetic_stock_plans')
                ->where('company_id', $companyId)
                ->where('event_id', $input['eventId'])
                ->lockForUpdate()->first();
            if ($prior) {
                if (! hash_equals($prior->fingerprint, $fingerprint)) {
                    throw new \DomainException('Synthetic planning replay was modified.');
                }
                return $this->planResult($companyId, $prior, true);
            }
            $id = DB::table('synthetic_stock_plans')->insertGetId([
                'company_id' => $companyId,
                'actor_user_id' => $actorId,
                'event_id' => $input['eventId'],
                'source_warehouse_id' => $input['sourceWarehouseId'],
                'target_warehouse_id' => $input['targetWarehouseId'],
                'commerce_order_event_id' => $order->id,
                'synthetic_crm_opportunity_id' => $deal->id,
                'sku' => $input['sku'], 'quantity' => $input['quantity'],
                'fingerprint' => $fingerprint,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $auditId = DB::table('audit_logs')->insertGetId([
                'company_id' => $companyId, 'actor_user_id' => $actorId,
                'event_type' => 'synthetic_inventory.plan_recorded',
                'entity_type' => 'synthetic_stock_plan',
                'entity_id' => (string) $id,
                'metadata' => json_encode([
                    'demo_only' => true, 'posting' => false,
                    'order_ref' => self::reference($companyId, 'order', (int) $order->id),
                    'crm_ref' => self::reference($companyId, 'crm', (int) $deal->id),
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            $row = DB::table('synthetic_stock_plans')->find($id);
            return [...$this->planResult($companyId, $row, false),
                'audit_ref' => self::reference($companyId, 'audit', $auditId)];
        }, 3);
    }

    private static function canonical(int $companyId, int $actorId,
        array $input, int $dealRowId): array
    {
        return [
            'company_id' => $companyId, 'actor_id' => $actorId,
            'event_id' => $input['eventId'],
            'source_warehouse_id' => $input['sourceWarehouseId'],
            'target_warehouse_id' => $input['targetWarehouseId'],
            'commerce_order_id' => $input['commerceOrderId'],
            'crm_row_id' => $dealRowId,
            'sku' => $input['sku'], 'quantity' => $input['quantity'],
            'demo_only' => true, 'posting' => false,
        ];
    }

    private function verifyPlan(int $companyId, object $row): void
    {
        $input = [
            'eventId' => $row->event_id,
            'sourceWarehouseId' => (int) $row->source_warehouse_id,
            'targetWarehouseId' => (int) $row->target_warehouse_id,
            'commerceOrderId' => (int) $row->commerce_order_event_id,
            'sku' => $row->sku, 'quantity' => (int) $row->quantity,
        ];
        $canonical = self::canonical($companyId, (int) $row->actor_user_id,
            $input, (int) $row->synthetic_crm_opportunity_id);
        if ((int) $row->company_id !== $companyId ||
            ! is_string($row->fingerprint) ||
            ! hash_equals($row->fingerprint,
                hash('sha256', json_encode($canonical, JSON_THROW_ON_ERROR)))) {
            throw new \DomainException('Synthetic warehouse planning record integrity failed.');
        }
    }

    private function planResult(int $companyId, object $row, bool $replayed): array
    {
        $this->verifyPlan($companyId, $row);
        return [
            'ref' => self::reference($companyId, 'plan', (int) $row->id),
            'order_ref' => self::reference($companyId, 'order',
                (int) $row->commerce_order_event_id),
            'crm_ref' => self::reference($companyId, 'crm',
                (int) $row->synthetic_crm_opportunity_id),
            'event_id' => $row->event_id,
            'sku' => $row->sku,
            'quantity' => (int) $row->quantity,
            'source_warehouse_id' => (int) $row->source_warehouse_id,
            'target_warehouse_id' => (int) $row->target_warehouse_id,
            'replayed' => $replayed, 'demo_only' => true,
            'posting' => false, 'inventory_reserved' => false,
        ];
    }

    /** Read only persisted synthetic records; never synthesizes a fake write. */
    public function snapshot(int $companyId, int $actorId, int $limit = 20): array
    {
        $this->enabled();
        if ($limit < 1 || $limit > 50) {
            throw new \DomainException('Invalid bounded business graph page.');
        }
        foreach (['crm.read', 'orders.read', 'inventory.read'] as $permission) {
            CompanyWorkflowAccess::requirePermission($companyId, $actorId, $permission);
        }

        $deals = DB::table('synthetic_crm_opportunities as deal')
            ->join('business_units as unit', 'unit.id', '=', 'deal.business_unit_id')
            ->where('deal.company_id', $companyId)
            ->where('unit.company_id', $companyId)->where('unit.active', true)
            ->orderByDesc('deal.id')->limit($limit)->get([
                'deal.id', 'deal.deal_id', 'deal.stage', 'deal.version',
                'deal.value_cents', 'unit.code as unit_code',
            ]);
        $crm = $deals->map(fn (object $row): array => [
            'ref' => self::reference($companyId, 'crm', (int) $row->id),
            'deal_id' => $row->deal_id,
            'unit_code' => $row->unit_code,
            'stage' => $row->stage,
            'version' => (int) $row->version,
            'value_cents' => (int) $row->value_cents,
        ])->all();

        $staged = app(SyntheticCommerceReview::class)->list(
            $companyId, $actorId, 0, $limit);
        $orders = array_map(fn (array $row): array => [
            'ref' => self::reference($companyId, 'order', (int) $row['id']),
            'external_order_id' => $row['external_order_id'],
            'provider' => $row['provider'],
            'warehouse_id' => $row['warehouse_id'],
            'total_cents' => $row['total_cents'],
            'status' => $row['status'],
        ], $staged['items']);

        $planRows = DB::table('synthetic_stock_plans')
            ->where('company_id', $companyId)->orderByDesc('id')
            ->limit($limit)->get();
        $plans = $planRows->map(
            fn (object $row): array => $this->planResult($companyId, $row, false)
        )->all();
        foreach ($plans as &$plan) {
            unset($plan['replayed']);
        }
        unset($plan);

        // Audit entries are joined only to the objects actually present in
        // this bounded snapshot. Raw metadata / PII is NEVER returned.
        $ids = [
            'synthetic_crm_opportunity' => $deals->pluck('id')->map(fn ($id): string => (string) $id)->all(),
            'commerce_order_event' => array_map(
                fn (array $item): string => explode(':', $item['ref'])[4], $orders),
            'synthetic_stock_plan' => $planRows->pluck('id')->map(fn ($id): string => (string) $id)->all(),
        ];
        $audits = DB::table('audit_logs')
            ->where('company_id', $companyId)
            ->whereIn('event_type', self::AUDIT_TYPES)
            ->where(function ($query) use ($ids): void {
                foreach ($ids as $type => $included) {
                    if ($included !== []) {
                        $query->orWhere(function ($sub) use ($type, $included): void {
                            $sub->where('entity_type', $type)
                                ->whereIn('entity_id', $included);
                        });
                    }
                }
            })
            ->orderByDesc('id')->limit($limit)->get();
        $audit = $audits->map(function (object $row) use ($companyId): array {
            $kind = match ($row->entity_type) {
                'commerce_order_event' => 'order',
                'synthetic_crm_opportunity' => 'crm',
                'synthetic_stock_plan' => 'plan',
                default => throw new \DomainException('Unknown synthetic audit entity.'),
            };
            return [
                'ref' => self::reference($companyId, 'audit', (int) $row->id),
                'entity_ref' => self::reference($companyId, $kind, (int) $row->entity_id),
                'event_type' => $row->event_type,
            ];
        })->all();

        return [
            'company_id' => $companyId, 'demo_only' => true,
            'read_only' => true, 'posting' => false,
            'inventory_reserved' => false, 'external_sync' => false,
            'bounded_limit' => $limit,
            'crm' => $crm, 'orders' => $orders,
            'stock_plans' => $plans, 'audit' => $audit,
        ];
    }
}
