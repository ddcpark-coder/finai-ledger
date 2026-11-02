<?php

namespace App\Infrastructure\Integrations\Documents;

interface InvoiceExtractor
{
    /**
     * Returns normalized fields and confidence metadata.
     * The implementation may use OCR, XML parsing, e-invoice parsing or an external AI provider.
     */
    public function extract(string $storageDisk, string $storagePath, string $mimeType): array;
}
