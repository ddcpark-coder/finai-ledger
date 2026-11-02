<?php

namespace App\Infrastructure\Integrations\Banking;

interface BankStatementImporter
{
    /**
     * Parses CAMT.053/CSV/other supported statement formats into a normalized statement payload.
     */
    public function parse(string $storageDisk, string $storagePath, string $mimeType): array;
}
