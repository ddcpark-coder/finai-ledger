<?php

use App\Domain\Partners\PartnerValidator;

it('normalizes VAT identifiers', function () {
    expect(PartnerValidator::normalizeVatId(' si 123 456 78 '))->toBe('SI12345678');
});

it('normalizes IBAN', function () {
    expect(PartnerValidator::normalizeIban('si56 1910 0001 2345 678'))->toBe('SI56191000012345678');
});

it('rejects invalid payment terms', function () {
    PartnerValidator::assertBasicIdentity([
        'name' => 'ACME d.o.o.',
        'country_code' => 'SI',
        'payment_terms_days' => 500,
    ]);
})->throws(DomainException::class);
