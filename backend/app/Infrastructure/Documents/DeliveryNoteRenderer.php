<?php

namespace App\Infrastructure\Documents;

interface DeliveryNoteRenderer
{
    /**
     * Produces a final immutable PDF from delivery note + receipt data.
     */
    public function render(array $deliveryNote, iterable $lines, array $receipt): array;
}
