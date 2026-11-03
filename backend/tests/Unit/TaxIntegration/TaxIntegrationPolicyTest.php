<?php

use App\Domain\TaxIntegration\RetryPolicy;
use App\Domain\TaxIntegration\TaxEnvironment;

it('keeps test and production eDavki endpoints separate', function () {
    expect(TaxEnvironment::Test->endpoint())->toContain('beta.edavki.durs.si')
        ->and(TaxEnvironment::Production->endpoint())->toBe('https://edavki.durs.si/SoapPortal/EdpSoapService.asmx');
});

it('backs off tax submission retries', function () {
    expect(RetryPolicy::delaySeconds(1))->toBe(60)
        ->and(RetryPolicy::delaySeconds(4))->toBe(3600)
        ->and(RetryPolicy::mayRetry('failed', 7))->toBeTrue()
        ->and(RetryPolicy::mayRetry('failed', 8))->toBeFalse();
});
