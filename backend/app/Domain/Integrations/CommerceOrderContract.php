<?php

namespace App\Domain\Integrations;

final class CommerceOrderContract
{
    public static function normalize(array $raw, int $companyId): array
    {
        $required = [
            'demoOnly','companyId','provider','connectionCode','warehouseId',
            'eventId','externalOrderId','currency','lines','totalCents',
        ];
        if (array_diff(array_keys($raw), $required)
            || array_diff($required, array_keys($raw))
            || ($raw['demoOnly'] ?? null) !== true
            || ($raw['companyId'] ?? null) !== $companyId
            || ! in_array($raw['provider'] ?? null, ['woocommerce','shopify'], true)
            || ! is_string($raw['connectionCode'] ?? null)
            || ! preg_match('/^SYN-[A-Z0-9-]{3,46}$/D', $raw['connectionCode'])
            || ! is_int($raw['warehouseId'] ?? null) || $raw['warehouseId'] < 1
            || ! is_string($raw['eventId'] ?? null)
            || ! preg_match('/^SYN-[A-Z0-9-]{3,70}$/D', $raw['eventId'])
            || ! is_string($raw['externalOrderId'] ?? null)
            || ! preg_match('/^SYN-[A-Z0-9-]{3,70}$/D', $raw['externalOrderId'])
            || $raw['currency'] !== 'EUR'
            || ! is_int($raw['totalCents'] ?? null)
            || $raw['totalCents'] <= 0 || $raw['totalCents'] > 1000000000
            || ! is_array($raw['lines'] ?? null)
            || ! array_is_list($raw['lines']) || count($raw['lines']) < 1
            || count($raw['lines']) > 10) {
            throw new \DomainException('Only strictly synthetic, PII-free shop events are allowed.');
        }

        $lines = []; $sum = 0;
        foreach ($raw['lines'] as $line) {
            if (! is_array($line) || array_diff(array_keys($line),
                ['sku','quantity','unitPriceCents'])
                || count($line) !== 3
                || ! is_string($line['sku'] ?? null)
                || ! preg_match('/^[A-Z0-9_-]{2,64}$/D', $line['sku'])
                || ! is_int($line['quantity'] ?? null)
                || $line['quantity'] < 1 || $line['quantity'] > 100
                || ! is_int($line['unitPriceCents'] ?? null)
                || $line['unitPriceCents'] < 1 || $line['unitPriceCents'] > 100000000) {
                throw new \DomainException('Invalid synthetic SKU, quantity or unit price.');
            }
            $lineAmount = $line['quantity'] * $line['unitPriceCents'];
            $sum += $lineAmount;
            if ($sum > 1000000000)throw new \DomainException('Synthetic amount is too large.');
            $lines[] = [
                'sku' => $line['sku'],
                'quantity' => $line['quantity'],
                'unit_price_cents' => $line['unitPriceCents'],
                'line_total_cents' => $lineAmount,
            ];
        }
        if ($sum !== $raw['totalCents'])
            throw new \DomainException('Synthetic order does not reconcile to its lines.');
        return [
            'company_id' => $companyId, 'demo_only' => true,
            'provider' => $raw['provider'],
            'connection_code' => $raw['connectionCode'],
            'warehouse_id' => $raw['warehouseId'],
            'event_id' => $raw['eventId'],
            'external_order_id' => $raw['externalOrderId'],
            'currency' => 'EUR', 'total_cents' => $sum,
            'lines' => $lines, 'posting' => false, 'status' => 'review',
        ];
    }
}
