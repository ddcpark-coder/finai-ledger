<?php

namespace App\Infrastructure\Integrations\Partners;

interface PartnerRegistryVerifier
{
    public function verifyCompany(string $countryCode, ?string $registrationNumber, ?string $taxNumber): array;
}
