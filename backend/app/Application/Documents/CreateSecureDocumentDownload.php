<?php

namespace App\Application\Documents;

use App\Infrastructure\Documents\SecureDocumentStore;
use Illuminate\Support\Facades\DB;

final class CreateSecureDocumentDownload
{
    public function __construct(private SecureDocumentStore $store) {}

    public function execute(int $documentId, int $userId, int $companyId): string
    {
        $document = DB::table('document_records')
            ->where('id', $documentId)
            ->where('company_id', $companyId)
            ->first();

        if (! $document) {
            throw new \DomainException('Document not found for active company.');
        }

        DB::table('document_access_logs')->insert([
            'document_record_id' => $documentId,
            'user_id' => $userId,
            'action' => 'download_url_created',
            'accessed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->store->temporaryDownloadUrl($document->storage_path, 300);
    }
}
