<?php

namespace App\Domain\Partners;

final class PartnerValidator
{
    public static function normalizeTaxNumber(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return strtoupper(preg_replace('/\s+/', '', trim($value)));
    }

    public static function normalizeVatId(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return strtoupper(preg_replace('/[^A-Z0-9]/i', '', trim($value)));
    }

    public static function normalizeIban(string $iban): string
    {
        return strtoupper(preg_replace('/\s+/', '', trim($iban)));
    }

    public static function assertBasicIdentity(array $data): void
    {
        if (trim((string) ($data['name'] ?? '')) === '') {
            throw new \DomainException('Partner name is required.');
        }

        $country = strtoupper((string) ($data['country_code'] ?? 'SI'));
        if (! preg_match('/^[A-Z]{2}$/', $country)) {
            throw new \DomainException('Country code must be ISO alpha-2.');
        }

        $terms = (int) ($data['payment_terms_days'] ?? 15);
        if ($terms < 0 || $terms > 365) {
            throw new \DomainException('Payment terms are outside allowed range.');
        }
    }
}
