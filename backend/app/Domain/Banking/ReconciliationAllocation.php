<?php

namespace App\Domain\Banking;

final class ReconciliationAllocation
{
    public static function assertValid(string|float|int $transactionAmount, string|float|int $openAmount, string|float|int $matchAmount): void
    {
        $transaction = abs(self::toCents($transactionAmount));
        $open = abs(self::toCents($openAmount));
        $match = self::toCents($matchAmount);

        if ($match <= 0) {
            throw new \DomainException('Matched amount must be positive.');
        }

        if ($match > $transaction || $match > $open) {
            throw new \DomainException('Matched amount exceeds available balance.');
        }
    }

    private static function toCents(string|float|int $amount): int
    {
        $normalized = str_replace(',', '.', trim((string) $amount));
        if (! preg_match('/^-?\d+(?:\.\d{1,2})?$/', $normalized)) {
            throw new \InvalidArgumentException('Invalid monetary amount.');
        }

        $negative = str_starts_with($normalized, '-');
        $normalized = ltrim($normalized, '-');
        [$whole, $fraction] = array_pad(explode('.', $normalized, 2), 2, '0');
        $cents = ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');

        return $negative ? -$cents : $cents;
    }
}
