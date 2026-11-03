<?php

namespace App\Infrastructure\Integrations\Tax;

interface XmlDocumentSigner
{
    /**
     * Sign XML using a certificate referenced by secure server-side configuration.
     * The certificate private key/password must never be persisted in application tables.
     */
    public function sign(string $xml, string $certificateReference): string;
}
