<?php

namespace App\Infrastructure\Integrations\Tax;

interface XmlSchemaValidator
{
    /**
     * Validate XML against the exact schema version configured for the document type.
     */
    public function validate(string $documentType, string $xml): array;
}
