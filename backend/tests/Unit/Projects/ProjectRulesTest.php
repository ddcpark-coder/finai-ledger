<?php
use App\Domain\Projects\ProjectProfitability;
use App\Domain\Projects\ProjectWorkflow;

it('calculates project margin',function(){
    expect(ProjectProfitability::calculate(10000,7000))->toBe([
        'revenue'=>10000.0,'cost'=>7000.0,'margin'=>3000.0,'margin_percent'=>30.0
    ]);
});

it('rejects more than 24 hours in one time entry',function(){
    ProjectProfitability::assertHours(24.01);
})->throws(DomainException::class);

it('rejects invalid project workflow jump',function(){
    ProjectWorkflow::assertTransition('planned','completed');
})->throws(DomainException::class);
