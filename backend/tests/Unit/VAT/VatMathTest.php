<?php

use App\Domain\VAT\VatMath;

it('converts VAT amounts without floating point arithmetic', function () {
    expect(VatMath::toCents('122.22'))->toBe(12222)
        ->and(VatMath::fromCents(12222))->toBe('122.22');
});

it('handles negative VAT amounts exactly', function () {
    expect(VatMath::toCents('-0.01'))->toBe(-1)
        ->and(VatMath::fromCents(-1))->toBe('-0.01');
});
