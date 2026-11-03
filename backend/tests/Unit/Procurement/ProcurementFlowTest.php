<?php
use App\Domain\Procurement\PurchaseOrderWorkflow;

it('accepts normal procurement progress',function(){
    PurchaseOrderWorkflow::assertTransition('draft','approved');
    PurchaseOrderWorkflow::assertTransition('ordered','partially_received');
    PurchaseOrderWorkflow::assertTransition('partially_received','received');
    expect(true)->toBeTrue();
});

it('rejects invalid procurement transition',function(){
    PurchaseOrderWorkflow::assertTransition('draft','received');
})->throws(DomainException::class);

it('rejects receiving more than ordered quantity',function(){
    PurchaseOrderWorkflow::assertReceiptQuantity(10,8,2.01);
})->throws(DomainException::class);
