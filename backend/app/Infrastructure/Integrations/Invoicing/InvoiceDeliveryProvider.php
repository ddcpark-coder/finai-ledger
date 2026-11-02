<?php

namespace App\Infrastructure\Integrations\Invoicing;

interface InvoiceDeliveryProvider
{
    /**
     * Sends or submits an already generated invoice artifact.
     * Implementations may support email, e-invoice networks or other channels.
     */
    public function deliver(array $invoice, array $artifact, array $recipient): array;
}
