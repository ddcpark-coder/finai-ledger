<?php

namespace App\Infrastructure\Integrations\Partners;

interface VatNumberVerifier
{
    public function verify(string $vatId): array;
}
