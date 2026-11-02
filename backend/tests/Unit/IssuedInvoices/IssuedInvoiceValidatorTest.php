<?php

use App\Domain\IssuedInvoices\IssuedInvoiceValidator;

it('accepts consistent issued invoice totals', function () {
    IssuedInvoiceValidator::assertTotals(
        ['net_amount' => '100.00', 'tax_amount' => '22.00', 'gross_amount' => '122.00'],
        [['net_amount' => '100.00', 'tax_amount' => '22.00', 'gross_amount' => '122.00']]
    );

    expect(true)->toBeTrue();
});

it('rejects mismatched issued invoice totals', function () {
    IssuedInvoiceValidator::assertTotals(
        ['net_amount' => '100.00', 'tax_amount' => '22.00', 'gross_amount' => '122.00'],
        [['net_amount' => '100.00', 'tax_amount' => '20.00', 'gross_amount' => '120.00']]
    );
})->throws(DomainException::class);
