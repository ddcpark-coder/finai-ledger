<?php

namespace App\Domain\IssuedInvoices;

final class IssuedInvoiceValidator
{
    public static function assertTotals(array $invoice, iterable $lines): void
    {
        $net = 0;
        $tax = 0;
        $gross = 0;
        $count = 0;

        foreach ($lines as $line) {
            $lineNet = self::toCents($line['net_amount'] ?? '0');
            $lineTax = self::toCents($line['tax_amount'] ?? '0');
            $lineGross = self::toCents($line['gross_amount'] ?? '0');

            if ($lineNet + $lineTax !== $lineGross) {
                throw new \DomainException('Issued invoice line totals are inconsistent.');
            }

            $net += $lineNet;
            $tax += $lineTax;
            $gross += $lineGross;
            $count++;
        }

        if ($count < 1) {
            throw new \DomainException('Issued invoice requires at least one line.');
        }

        if (
            $net !== self::toCents($invoice['net_amount'] ?? '0') ||
            $tax !== self::toCents($invoice['tax_amount'] ?? '0') ||
            $gross !== self::toCents($invoice['gross_amount'] ?? '0')
        ) {
            throw new \DomainException('Issued invoice header totals do not match lines.');
        }
    }

    public static function assertReadyToIssue(array $invoice): void
    {
        foreach (['partner_id', 'issue_date', 'due_date', 'gross_amount'] as $field) {
            if (empty($invoice[$field])) {
                throw new \DomainException("Missing required invoice field: {$field}");
            }
        }
    }

    private static function toCents(string|int|float $amount): int
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
