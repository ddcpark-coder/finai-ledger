<?php

namespace App\Infrastructure\Documents;

interface SecureDocumentStore
{
    public function put(string $path, string $contents, string $mimeType): array;
    public function temporaryDownloadUrl(string $path, int $ttlSeconds): string;
}
