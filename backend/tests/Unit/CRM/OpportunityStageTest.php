<?php

use App\Domain\CRM\OpportunityStage;

it('maps CRM stages to sensible default probabilities', function () {
    expect(OpportunityStage::Qualification->defaultProbability())->toBe(10)
        ->and(OpportunityStage::Proposal->defaultProbability())->toBe(60)
        ->and(OpportunityStage::Won->defaultProbability())->toBe(100)
        ->and(OpportunityStage::Lost->defaultProbability())->toBe(0);
});
