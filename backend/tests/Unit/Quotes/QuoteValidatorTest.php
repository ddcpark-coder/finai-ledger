<?php

use App\Domain\Quotes\QuoteValidator;

it('accepts a valid quote', function () {
    QuoteValidator::assertReady(
        ['partner_id'=>1,'issue_date'=>'2026-11-03','currency'=>'EUR','net_amount'=>100,'tax_amount'=>22,'gross_amount'=>122],
        [['quantity'=>1,'unit_price'=>100,'net_amount'=>100,'tax_amount'=>22,'gross_amount'=>122]]
    );
    expect(true)->toBeTrue();
});

it('rejects quote totals that do not match lines', function () {
    QuoteValidator::assertReady(
        ['partner_id'=>1,'issue_date'=>'2026-11-03','currency'=>'EUR','net_amount'=>100,'tax_amount'=>22,'gross_amount'=>120],
        [['quantity'=>1,'unit_price'=>100,'net_amount'=>100,'tax_amount'=>22,'gross_amount'=>122]]
    );
})->throws(DomainException::class);
