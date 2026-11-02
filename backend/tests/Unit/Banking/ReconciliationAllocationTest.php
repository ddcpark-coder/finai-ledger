<?php

use App\Domain\Banking\ReconciliationAllocation;

it('accepts a partial reconciliation', function () {
    ReconciliationAllocation::assertValid('1000.00', '2440.00', '1000.00');
    expect(true)->toBeTrue();
});

it('rejects an allocation above transaction amount', function () {
    ReconciliationAllocation::assertValid('1000.00', '2440.00', '1000.01');
})->throws(DomainException::class);

it('rejects an allocation above open item amount', function () {
    ReconciliationAllocation::assertValid('2000.00', '500.00', '500.01');
})->throws(DomainException::class);
