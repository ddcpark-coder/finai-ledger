<?php

namespace App\Domain\Accounting;

final class BalanceCalculator
{
    public static function toCents(string|int|float $amount): int
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

    public static function assertBalanced(iterable $entries): void
    {
        $debit = 0;
        $credit = 0;
        $count = 0;

        foreach ($entries as $entry) {
            $d = self::toCents($entry['debit'] ?? '0');
            $c = self::toCents($entry['credit'] ?? '0');

            if (($d > 0 && $c > 0) || ($d === 0 && $c === 0) || $d < 0 || $c < 0) {
                throw new \DomainException('Each journal line must contain exactly one positive debit or credit amount.');
            }

            $debit += $d;
            $credit += $c;
            $count++;
        }

        if ($count < 2) {
            throw new \DomainException('A journal requires at least two lines.');
        }

        if ($debit !== $credit) {
            throw new \DomainException('Journal is not balanced.');
        }
    }
}
