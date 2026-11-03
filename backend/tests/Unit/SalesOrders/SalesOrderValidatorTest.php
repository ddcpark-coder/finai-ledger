<?php
use App\Domain\SalesOrders\SalesOrderValidator;

it('accepts normal order progress',function(){
    SalesOrderValidator::assertProgress('confirmed','in_progress');
    SalesOrderValidator::assertProgress('ready_for_delivery','delivered');
    expect(true)->toBeTrue();
});

it('rejects skipping directly from confirmed to delivered',function(){
    SalesOrderValidator::assertProgress('confirmed','delivered');
})->throws(DomainException::class);
