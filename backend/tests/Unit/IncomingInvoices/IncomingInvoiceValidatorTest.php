<?php

use App\Domain\IncomingInvoices\IncomingInvoiceValidator;

it('accepts consistent invoice totals', function () {
    IncomingInvoiceValidator::assertTotals(
        ['net_amount' => '100.00', 'tax_amount' => '22.00', 'gross_amount' => '122.00'],
        [['net_amount' => '100.00', 'tax_amount' => '22.00', 'gross_amount' => '122.00']]
    );

    expect(true)->toBeTrue();
});

it('rejects inconsistent invoice totals', function () {
    IncomingInvoiceValidator::assertTotals(
        ['net_amount' => '100.00', 'tax_amount' => '22.00', 'gross_amount' => '122.00'],
        [['net_amount' => '100.00', 'tax_amount' => '21.00', 'gross_amount' => '122.00']]
    );
})->throws(DomainException::class);
