<?php
use App\Domain\Inventory\InventoryMath;

it('calculates available stock from on hand and reserved',function(){
    expect(InventoryMath::available(100,30))->toBe(70.0);
});

it('rejects reservation above available stock',function(){
    InventoryMath::assertCanReserve(5,5.01);
})->throws(DomainException::class);

it('rejects non-positive inventory quantity',function(){
    InventoryMath::assertPositiveQuantity(0);
})->throws(DomainException::class);
