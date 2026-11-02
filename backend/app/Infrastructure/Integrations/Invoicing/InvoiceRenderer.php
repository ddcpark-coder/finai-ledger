<?php

namespace App\Infrastructure\Integrations\Invoicing;

interface InvoiceRenderer
{
    /**
     * Generates an immutable invoice artifact such as PDF or structured e-invoice XML.
     */
    public function render(array $invoice, iterable $lines, string $format): array;
}
