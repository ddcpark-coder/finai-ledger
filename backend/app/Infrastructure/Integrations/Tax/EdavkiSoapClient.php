<?php

namespace App\Infrastructure\Integrations\Tax;

interface EdavkiSoapClient
{
    /**
     * Submit an already schema-validated and signed XML document.
     * Implementations must use the endpoint belonging to the configured environment.
     */
    public function submit(string $endpoint, string $signedXml, array $context): array;

    /**
     * Retrieve current remote state for a previously submitted document.
     */
    public function status(string $endpoint, string $remoteDocumentId, array $context): array;
}
