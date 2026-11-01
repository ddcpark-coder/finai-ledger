<?php

use App\Domain\Accounting\BalanceCalculator;

it('accepts a balanced journal', function () {
    BalanceCalculator::assertBalanced([
        ['debit' => '100.00', 'credit' => '0.00'],
        ['debit' => '0.00', 'credit' => '100.00'],
    ]);

    expect(true)->toBeTrue();
});

it('rejects an unbalanced journal', function () {
    BalanceCalculator::assertBalanced([
        ['debit' => '100.00', 'credit' => '0.00'],
        ['debit' => '0.00', 'credit' => '99.99'],
    ]);
})->throws(DomainException::class);

it('rejects debit and credit on the same line', function () {
    BalanceCalculator::assertBalanced([
        ['debit' => '100.00', 'credit' => '1.00'],
        ['debit' => '0.00', 'credit' => '99.00'],
    ]);
})->throws(DomainException::class);
