<?php

namespace App\Application\Integrations;

use DateTimeImmutable;
use DateTimeZone;

final class StageVerifiedSyntheticCommerceWebhook
{
    /**
     * Test-only provider signature contract, never a live webhook endpoint.
     * Shopify X-Shopify-Hmac-Sha256 and WooCommerce X-WC-Webhook-Signature
     * both use Base64-encoded HMAC-SHA256 over the EXACT raw body.
     * A signed synthetic issuedAt in the body provides an additional QA window;
     * production providers need their own independent replay/transport controls.
     */
    public function execute(int $companyId, int $actorId, string $provider,
        string $rawBody, string $signatureBase64, string $temporaryTestSecret): array
    {
        if (! app()->environment('local','testing') ||
            ! config('finai.synthetic_commerce_staging_enabled', false)) {
            throw new \DomainException('Synthetic commerce signing is disabled.');
        }
        if (! in_array($provider, ['shopify', 'woocommerce'], true) ||
            strlen($rawBody) < 2 || strlen($rawBody) > 8192 ||
            strlen($temporaryTestSecret) < 20 || strlen($temporaryTestSecret) > 256 ||
            strlen($signatureBase64) !== 44 ||
            ! preg_match('/^[A-Za-z0-9+\/]{43}=$/D', $signatureBase64)) {
            throw new \DomainException('Invalid synthetic commerce signature input.');
        }
        $supplied = base64_decode($signatureBase64, true);
        if ($supplied === false || strlen($supplied) !== 32) {
            throw new \DomainException('Invalid synthetic webhook signature.');
        }
        $expected = hash_hmac('sha256', $rawBody, $temporaryTestSecret, true);
        if (! hash_equals($expected, $supplied)) {
            throw new \DomainException('Synthetic commerce webhook signature failed.');
        }
        try {
            $payload = json_decode($rawBody, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new \DomainException('Synthetic webhook body is not JSON.');
        }
        if (! is_array($payload) || array_is_list($payload) ||
            ! isset($payload['issuedAt']) || ! is_string($payload['issuedAt']) ||
            strlen($payload['issuedAt']) !== 20 ||
            ! preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/D',
                $payload['issuedAt'])) {
            throw new \DomainException('Missing signed synthetic webhook issue time.');
        }
        $issued = DateTimeImmutable::createFromFormat(
            '!Y-m-d\TH:i:s\Z', $payload['issuedAt'], new DateTimeZone('UTC'));
        if (! $issued || $issued->format('Y-m-d\TH:i:s\Z') !== $payload['issuedAt'] ||
            abs(time() - $issued->getTimestamp()) > 300) {
            throw new \DomainException('Synthetic webhook is stale or future-dated.');
        }
        // Every other field must match the existing strict PII-free, test-only
        // CommerceOrderContract exactly. No customer, billing, tax or real IDs.
        unset($payload['issuedAt']);
        if (($payload['provider'] ?? null) !== $provider) {
            throw new \DomainException('Signed commerce provider mismatch.');
        }

        // StageSyntheticCommerceOrder applies company membership, connection,
        // warehouse, SKU mapping, idempotency and atomic audit. Never posts stock.
        return app(StageSyntheticCommerceOrder::class)
            ->execute($companyId, $actorId, $payload);
    }
}
