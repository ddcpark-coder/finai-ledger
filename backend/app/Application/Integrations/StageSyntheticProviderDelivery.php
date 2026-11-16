<?php

namespace App\Application\Integrations;

final class StageSyntheticProviderDelivery
{
    /**
     * NEXT14B: two provider-specific HEADER fixtures, never public HTTP routes.
     * The raw body is still the strictly synthetic PII-free FinAI test contract,
     * NOT the real Shopify or WooCommerce order payload.
     *
     * Shopify header definitions: X-Shopify-Hmac-SHA256, X-Shopify-Topic,
     * X-Shopify-Webhook-Id and X-Shopify-Shop-Domain.
     * WooCommerce: X-WC-Webhook-Signature, X-WC-Webhook-Topic,
     * X-WC-Webhook-Resource and X-WC-Webhook-Delivery-ID.
     */
    public function execute(int $companyId, int $actorId, string $provider,
        string $rawBody, array $headers, string $temporaryTestSecret): array
    {
        if (! app()->environment('local', 'testing') ||
            ! config('finai.synthetic_commerce_staging_enabled', false)) {
            throw new \DomainException('Synthetic provider delivery is disabled.');
        }
        if (! in_array($provider, ['shopify', 'woocommerce'], true)) {
            throw new \DomainException('Unsupported synthetic provider.');
        }
        $header = self::normalizeHeaders($headers);
        $expected = $provider === 'shopify'
            ? [
                'content-type', 'x-shopify-hmac-sha256', 'x-shopify-shop-domain',
                'x-shopify-topic', 'x-shopify-webhook-id',
            ]
            : [
                'content-type', 'x-wc-webhook-delivery-id', 'x-wc-webhook-resource',
                'x-wc-webhook-signature', 'x-wc-webhook-topic',
            ];
        $actual = array_keys($header);
        sort($actual);
        sort($expected);
        if ($actual !== $expected || $header['content-type'] !== 'application/json') {
            throw new \DomainException('Unexpected synthetic provider header set.');
        }

        if ($provider === 'shopify') {
            if ($header['x-shopify-topic'] !== 'orders/create' ||
                $header['x-shopify-shop-domain'] !== 'synthetic-shop.myshopify.com' ||
                ! preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iD',
                    $header['x-shopify-webhook-id'])) {
                throw new \DomainException('Not a synthetic Shopify order delivery.');
            }
            $deliveryEventId = 'SYN-SHOP-'.strtoupper(str_replace(
                '-', '', $header['x-shopify-webhook-id']));
            $signature = $header['x-shopify-hmac-sha256'];
        } else {
            if ($header['x-wc-webhook-topic'] !== 'order.created' ||
                $header['x-wc-webhook-resource'] !== 'order' ||
                ! preg_match('/^[1-9][0-9]{0,9}$/D',
                    $header['x-wc-webhook-delivery-id'])) {
                throw new \DomainException('Not a synthetic WooCommerce order delivery.');
            }
            $deliveryEventId = 'SYN-WC-DEL-'.$header['x-wc-webhook-delivery-id'];
            $signature = $header['x-wc-webhook-signature'];
        }

        // FIRST verify raw bytes with HMAC. Do NOT parse or stage beforehand.
        StageVerifiedSyntheticCommerceWebhook::assertSignature(
            $rawBody, $signature, $temporaryTestSecret);

        try {
            $payload = json_decode($rawBody, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new \DomainException('Signed synthetic provider body is not JSON.');
        }
        if (! is_array($payload) || array_is_list($payload) ||
            ($payload['provider'] ?? null) !== $provider ||
            ($payload['eventId'] ?? null) !== $deliveryEventId) {
            throw new \DomainException('Signed synthetic event does not match provider delivery.');
        }

        // Existing strict contract re-checks signed timestamp, tenant permissions,
        // SKU mapping and idempotency, then stages only review / posting=false.
        // Do not pass any real customer, address, payment, tax or external token.
        return app(StageVerifiedSyntheticCommerceWebhook::class)->execute(
            $companyId, $actorId, $provider, $rawBody, $signature,
            $temporaryTestSecret);
    }

    private static function normalizeHeaders(array $headers): array
    {
        if (count($headers) !== 5) {
            throw new \DomainException('Synthetic delivery requires five safe headers.');
        }
        $normalized = [];
        foreach ($headers as $key => $value) {
            if (! is_string($key) || ! preg_match('/^[A-Za-z0-9-]{2,60}$/D', $key) ||
                ! is_string($value) || $value === '' || strlen($value) > 256 ||
                str_contains($value, "\r") || str_contains($value, "\n")) {
                throw new \DomainException('Invalid synthetic webhook header.');
            }
            $name = strtolower($key);
            if (array_key_exists($name, $normalized)) {
                throw new \DomainException('Duplicate provider webhook header.');
            }
            $normalized[$name] = $value;
        }
        return $normalized;
    }
}
