<?php

namespace App\Infrastructure\Integrations\Sales;

interface QuoteOrderConverter
{
    /**
     * Converts an accepted quote into a sales order.
     * Implemented in Phase 17 to keep Phase 16 independent from order persistence.
     */
    public function convert(int $quoteId, int $userId): int;
}
