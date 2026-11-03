<?php

namespace App\Domain\Quotes;

final class QuoteValidator
{
    public static function assertReady(array $quote, iterable $lines): void
    {
        foreach (['partner_id','issue_date','currency'] as $field) {
            if (empty($quote[$field])) {
                throw new \DomainException("Missing quote field: {$field}");
            }
        }

        $count = 0;
        $net = 0.0; $tax = 0.0; $gross = 0.0;
        foreach ($lines as $line) {
            $count++;
            if ((float)($line['quantity'] ?? 0) <= 0) {
                throw new \DomainException('Quote line quantity must be positive.');
            }
            if ((float)($line['unit_price'] ?? 0) < 0) {
                throw new \DomainException('Quote line price cannot be negative.');
            }
            $net += (float)$line['net_amount'];
            $tax += (float)$line['tax_amount'];
            $gross += (float)$line['gross_amount'];
        }

        if ($count < 1) {
            throw new \DomainException('Quote requires at least one line.');
        }

        if (abs($net - (float)$quote['net_amount']) > 0.01 ||
            abs($tax - (float)$quote['tax_amount']) > 0.01 ||
            abs($gross - (float)$quote['gross_amount']) > 0.01) {
            throw new \DomainException('Quote totals do not match lines.');
        }
    }
}
