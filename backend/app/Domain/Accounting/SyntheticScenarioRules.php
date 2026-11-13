<?php

namespace App\Domain\Accounting;

final class SyntheticScenarioRules
{
    public const STOCK_START = 12;
    public const ORDER_QUANTITY = 3;
    public const NET_CENTS = 10000;
    public const VAT_CENTS = 2200;
    public const GROSS_CENTS = 12200;

    public static function initial(): array
    {
        return [
            'state' => 'draft', 'version' => 0, 'on_hand' => self::STOCK_START,
            'reserved' => 0, 'dispatched' => 0,
        ];
    }

    public static function apply(array $current, string $action): array
    {
        self::assertStock($current);
        $expected = [
            'reserve' => 'draft',
            'deliver' => 'reserved',
            'invoice' => 'delivered',
            'reverse_invoice' => 'invoiced',
        ];
        if (! isset($expected[$action]) || $current['state'] !== $expected[$action]) {
            throw new \DomainException('The synthetic action is out of sequence.');
        }
        $next = $current;
        $next['version'] = $current['version'] + 1;
        $lines = [];
        $movement = ['on_hand' => 0, 'reserved' => 0, 'dispatched' => 0];
        switch ($action) {
            case 'reserve':
                $next['reserved'] += self::ORDER_QUANTITY;
                $next['state'] = 'reserved';
                $movement['reserved'] = self::ORDER_QUANTITY;
                break;
            case 'deliver':
                if ($current['reserved'] < self::ORDER_QUANTITY) {
                    throw new \DomainException('The synthetic order has no reservation.');
                }
                $next['reserved'] -= self::ORDER_QUANTITY;
                $next['on_hand'] -= self::ORDER_QUANTITY;
                $next['dispatched'] += self::ORDER_QUANTITY;
                $next['state'] = 'delivered';
                $movement = [
                    'on_hand' => -self::ORDER_QUANTITY,
                    'reserved' => -self::ORDER_QUANTITY,
                    'dispatched' => self::ORDER_QUANTITY,
                ];
                break;
            case 'invoice':
                $next['state'] = 'invoiced';
                $lines = [
                    ['account' => '1200', 'debit_cents' => self::GROSS_CENTS, 'credit_cents' => 0],
                    ['account' => '7600', 'debit_cents' => 0, 'credit_cents' => self::NET_CENTS],
                    ['account' => '2600', 'debit_cents' => 0, 'credit_cents' => self::VAT_CENTS],
                ];
                break;
            case 'reverse_invoice':
                $next['state'] = 'invoice_reversed';
                $lines = [
                    ['account' => '1200', 'debit_cents' => 0, 'credit_cents' => self::GROSS_CENTS],
                    ['account' => '7600', 'debit_cents' => self::NET_CENTS, 'credit_cents' => 0],
                    ['account' => '2600', 'debit_cents' => self::VAT_CENTS, 'credit_cents' => 0],
                ];
                break;
        }
        if ($lines !== []) {
            BalanceCalculator::assertBalanced(array_map(static fn (array $line) => [
                'debit' => number_format($line['debit_cents'] / 100, 2, '.', ''),
                'credit' => number_format($line['credit_cents'] / 100, 2, '.', ''),
            ], $lines));
        }
        self::assertStock($next);
        return ['next' => $next, 'journal_lines' => $lines, 'stock_movement' => $movement];
    }

    public static function assertStock(array $state): void
    {
        foreach (['version', 'on_hand', 'reserved', 'dispatched'] as $field) {
            if (! isset($state[$field]) || ! is_int($state[$field]) || $state[$field] < 0) {
                throw new \DomainException('Invalid synthetic stock state.');
            }
        }
        $expected = [
            'draft' => ['version'=>0, 'on_hand'=>12, 'reserved'=>0, 'dispatched'=>0],
            'reserved' => ['version'=>1, 'on_hand'=>12, 'reserved'=>3, 'dispatched'=>0],
            'delivered' => ['version'=>2, 'on_hand'=>9, 'reserved'=>0, 'dispatched'=>3],
            'invoiced' => ['version'=>3, 'on_hand'=>9, 'reserved'=>0, 'dispatched'=>3],
            'invoice_reversed' => ['version'=>4, 'on_hand'=>9, 'reserved'=>0, 'dispatched'=>3],
        ];
        $stateKey = $state['state'] ?? '';
        if (! isset($expected[$stateKey])) {
            throw new \DomainException('Unknown synthetic scenario state.');
        }
        foreach ($expected[$stateKey] as $field => $value) {
            if ($state[$field] !== $value) {
                throw new \DomainException('Synthetic scenario state and stock disagree.');
            }
        }
        if ($state['reserved'] > $state['on_hand']
            || $state['on_hand'] + $state['dispatched'] !== self::STOCK_START
            || $state['reserved'] > self::ORDER_QUANTITY
            || $state['dispatched'] > self::ORDER_QUANTITY) {
            throw new \DomainException('Synthetic inventory conservation failed.');
        }
    }
}
