<?php

use App\Domain\Catalog\MarginCalculator;
use App\Domain\Catalog\ProductValidator;

it('calculates margin and markup separately', function () {
    expect(MarginCalculator::grossMarginPercent('120', '80'))->toBe(33.33)
        ->and(MarginCalculator::markupPercent('120', '80'))->toBe(50.0);
});

it('rejects a default price below minimum sales price', function () {
    ProductValidator::assertValid([
        'sku' => 'TEST-1',
        'name' => 'Test',
        'type' => 'product',
        'sales_price' => 90,
        'min_sales_price' => 100,
    ]);
})->throws(DomainException::class);
