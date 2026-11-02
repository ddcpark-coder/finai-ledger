<?php

use App\Domain\AI\ConfidencePolicy;

it('forces manual review when risk exists', function () {
    expect(ConfidencePolicy::classify(99.5, 'review'))->toBe('manual_review');
});

it('allows only explicit high confidence automation', function () {
    expect(ConfidencePolicy::mayAutoAccept(99.0, 'normal', true))->toBeTrue()
        ->and(ConfidencePolicy::mayAutoAccept(99.0, 'normal', false))->toBeFalse()
        ->and(ConfidencePolicy::mayAutoAccept(99.0, 'review', true))->toBeFalse();
});
