<?php

namespace App\Application\Integrations;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Provider-shaped SYNTHETIC orders only. Not a real Woo/Shopify decoder:
 * real provider payloads contain PII, taxes, discounts, delivery fees and
 * identifiers, which are all REJECTED instead of silently discarded.
 */
final class StageSyntheticProviderOrder
{
    public function execute(int $companyId, int $actorId, string $provider,
        string $rawBody, array $headers, string $temporaryTestSecret,
        string $trustedConnectionCode, int $trustedWarehouseId): array
    {
        if (! app()->environment('local', 'testing') ||
            ! config('finai.synthetic_commerce_staging_enabled', false)) {
            throw new \DomainException('Provider-shaped synthetic orders disabled.');
        }
        $context = StageSyntheticProviderDelivery::verifySignedHeaderContext(
            $provider, $rawBody, $headers, $temporaryTestSecret);
        $normalized = self::convert(
            $provider, $rawBody, $companyId, $context['eventId'],
            $trustedConnectionCode, $trustedWarehouseId);
        // Strict tenant, warehouse, connections, SKU, replay and audit checks
        // stay centralized; no direct insertion or accounting posting.
        return app(StageSyntheticCommerceOrder::class)->execute(
            $companyId, $actorId, $normalized);
    }

    /** For tests only: converting after signature verification is mandatory. */
    private static function convert(string $provider, string $raw, int $companyId,
        string $eventId, string $connectionCode, int $warehouseId): array
    {
        try {
            $order = json_decode($raw, true, 24, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new \DomainException('Invalid signed synthetic provider body.');
        }
        if (! is_array($order) || array_is_list($order)) {
            throw new \DomainException('Synthetic provider body must be an order object.');
        }
        $keys = $provider === 'shopify'
            ? ['id', 'demoOnly', 'issuedAt', 'currency', 'total_price', 'line_items']
            : ['id', 'demoOnly', 'issuedAt', 'currency', 'total', 'line_items'];
        if (! self::exactKeys($order, $keys) ||
            ($order['demoOnly'] ?? null) !== true ||
            ! is_int($order['id'] ?? null) ||
            $order['id'] < 7000 || $order['id'] > 7999 ||
            ($order['currency'] ?? null) !== 'EUR' ||
            ! is_array($order['line_items'] ?? null) ||
            ! array_is_list($order['line_items']) ||
            count($order['line_items']) < 1 || count($order['line_items']) > 10) {
            throw new \DomainException('Real or unsupported shop data is forbidden.');
        }
        self::verifySyntheticTime($order['issuedAt'] ?? null);
        $lines = [];
        $total = 0;
        foreach ($order['line_items'] as $line) {
            if (! is_array($line) ||
                ! self::exactKeys($line, $provider === 'shopify'
                    ? ['sku', 'quantity', 'price']
                    : ['sku', 'quantity', 'price', 'total']) ||
                ! is_string($line['sku'] ?? null) ||
                ! preg_match('/^SYN-[A-Z0-9-]{3,35}$/D', $line['sku']) ||
                ! is_int($line['quantity'] ?? null) ||
                $line['quantity'] < 1 || $line['quantity'] > 100) {
                throw new \DomainException('Invalid synthetic shop line.');
            }
            $unit = self::cents($line['price'] ?? null);
            $amount = $unit * $line['quantity'];
            if ($provider === 'woocommerce' &&
                $amount !== self::cents($line['total'] ?? null)) {
                throw new \DomainException('Synthetic WooCommerce line amount mismatch.');
            }
            $total += $amount;
            if ($total > 1_000_000_000) {
                throw new \DomainException('Synthetic order exceeds allowed amount.');
            }
            $lines[] = [
                'sku' => $line['sku'],
                'quantity' => $line['quantity'],
                'unitPriceCents' => $unit,
            ];
        }
        $declared = self::cents($provider === 'shopify'
            ? $order['total_price'] : $order['total']);
        if ($declared !== $total || $total <= 0) {
            throw new \DomainException('Synthetic order total does not reconcile.');
        }
        return [
            'demoOnly' => true,
            'companyId' => $companyId,
            'provider' => $provider,
            'connectionCode' => $connectionCode,
            'warehouseId' => $warehouseId,
            'eventId' => $eventId,
            'externalOrderId' => 'SYN-'.$order['id'].'-'.strtoupper($provider),
            'currency' => 'EUR',
            'lines' => $lines,
            'totalCents' => $total,
        ];
    }

    private static function exactKeys(array $payload, array $expected): bool
    {
        $actual = array_keys($payload);
        sort($actual);
        sort($expected);
        return $actual === $expected;
    }

    private static function cents(mixed $value): int
    {
        // Explicit decimal strings avoid floating point and hidden rounding.
        if (! is_string($value) ||
            ! preg_match('/^(0|[1-9][0-9]{0,6})\.[0-9]{2}$/D', $value)) {
            throw new \DomainException('Synthetic prices must be exact EUR decimal strings.');
        }
        [$euros, $cents] = explode('.', $value, 2);
        $amount = ((int) $euros) * 100 + (int) $cents;
        if ($amount < 1 || $amount > 100_000_000) {
            throw new \DomainException('Synthetic price out of range.');
        }
        return $amount;
    }

    private static function verifySyntheticTime(mixed $value): void
    {
        if (! is_string($value) ||
            ! preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/D', $value)) {
            throw new \DomainException('Signed synthetic issuedAt required.');
        }
        $parsed = DateTimeImmutable::createFromFormat(
            '!Y-m-d\TH:i:s\Z', $value, new DateTimeZone('UTC'));
        if (! $parsed || $parsed->format('Y-m-d\TH:i:s\Z') !== $value ||
            abs(time() - $parsed->getTimestamp()) > 300) {
            throw new \DomainException('Expired synthetic signed order.');
        }
    }
}
