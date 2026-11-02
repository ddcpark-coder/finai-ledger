<?php

namespace App\Infrastructure\Integrations\Banking;

interface SepaPaymentExporter
{
    /**
     * Generates a payment artifact, e.g. pain.001 XML, from a validated payment batch.
     */
    public function export(array $batch, iterable $items): array;
}
