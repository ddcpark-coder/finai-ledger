<?php

namespace App\Infrastructure\Integrations\Tax;

interface VatReturnExporter
{
    /**
     * Generates a provider-specific tax artifact (e.g. eDavki-compatible XML)
     * from a validated internal VAT return.
     */
    public function export(array $return, array $period, iterable $entries): array;
}
