<?php

namespace App\Application\Documents;

use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class SyntheticReceiptSync
{
    private const DOCUMENTS = [
        1 => 'SYNTH-DOB-2026-0048',
        2 => 'SYNTH-DOB-2026-B001',
        3 => 'SYNTH-DOB-2026-C001',
    ];

    private function authorize(int $userId, int $companyId, string $documentId): void
    {
        abort_unless(app()->environment(['local', 'testing'])
            && config('finai.synthetic_receipt_sync_enabled', false), 404);
        abort_unless(isset(self::DOCUMENTS[$companyId])
            && self::DOCUMENTS[$companyId] === $documentId, 404);
        $user = User::findOrFail($userId);
        abort_unless(Gate::forUser($user)->allows('company.access', $companyId), 403);
    }

    public function status(int $userId, int $companyId, string $documentId): array
    {
        $this->authorize($userId, $companyId, $documentId);
        $version = (int) (DB::table('synthetic_receipt_sync_events')
            ->where('user_id', $userId)->where('company_id', $companyId)
            ->where('document_id', $documentId)->max('version') ?? 0);
        return [
            'company_id' => $companyId,
            'document_id' => $documentId,
            'version' => $version,
            'demo_only' => true,
            'real_sync_enabled' => false,
        ];
    }

    /**
     * Returns only the latest *client-encrypted* envelope to the same authenticated
     * user/company. Never exposes the Laravel-encrypted DB value or plaintext.
     * The client must still supply its private passphrase to decrypt locally.
     */
    public function latest(int $userId, int $companyId, string $documentId): array
    {
        $this->authorize($userId, $companyId, $documentId);
        $row = DB::table('synthetic_receipt_sync_events')
            ->where('user_id', $userId)->where('company_id', $companyId)
            ->where('document_id', $documentId)
            ->orderByDesc('version')->first();
        if (!$row) {
            return [
                'company_id' => $companyId, 'document_id' => $documentId,
                'version' => 0, 'envelope' => null,
                'demo_only' => true, 'real_sync_enabled' => false,
            ];
        }
        $envelope = json_decode(
            Crypt::decryptString($row->encrypted_envelope), true, 512,
            JSON_THROW_ON_ERROR
        );
        return [
            'company_id' => $companyId, 'document_id' => $documentId,
            'version' => (int) $row->version,
            'envelope' => $envelope, // already client-encrypted, not plaintext
            'demo_only' => true, 'real_sync_enabled' => false,
        ];
    }

    public function accept(
        int $userId, int $companyId, string $documentId,
        string $eventId, int $expectedVersion, array $envelope
    ): array {
        $this->authorize($userId, $companyId, $documentId);
        abort_unless($envelope['format'] === 'finai-mobile-synthetic-vault-v1'
            && (int) $envelope['companyId'] === $companyId
            && $envelope['documentId'] === $documentId
            && (int) $envelope['version'] === 1
            && (int) $envelope['iterations'] === 250000,
            422, 'Envelope does not match selected demo receipt.');

        $payload = json_encode($envelope, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        abort_unless(strlen($payload) <= 260000, 413);
        $digest = hash('sha256', $payload);

        return DB::transaction(function () use (
            $userId, $companyId, $documentId, $eventId, $expectedVersion,
            $payload, $digest
        ): array {
            // Serializes events within a company for a guarded test runtime.
            // Real sync will require a separate production-grade concurrency design.
            $company = DB::table('companies')->where('id', $companyId)->lockForUpdate()->first();
            abort_unless($company, 404);

            $previous = DB::table('synthetic_receipt_sync_events')
                ->where('company_id', $companyId)
                ->where('user_id', $userId)->where('client_event_id', $eventId)->first();
            if ($previous) {
                abort_unless($previous->document_id === $documentId
                    && hash_equals($previous->payload_sha256, $digest),
                    409, 'Changed duplicate event rejected.');
                return $this->acknowledge($companyId, $documentId, (int) $previous->version, true);
            }

            $currentVersion = (int) (DB::table('synthetic_receipt_sync_events')
                ->where('company_id', $companyId)
                ->where('user_id', $userId)->where('document_id', $documentId)
                ->max('version') ?? 0);
            abort_unless($currentVersion === $expectedVersion, 409,
                'Sync conflict: refresh demo receipt version before retrying.');

            $version = $currentVersion + 1;
            DB::table('synthetic_receipt_sync_events')->insert([
                'company_id' => $companyId,
                'user_id' => $userId,
                'client_event_id' => $eventId,
                'document_id' => $documentId,
                'version' => $version,
                'payload_sha256' => $digest,
                'encrypted_envelope' => Crypt::encryptString($payload),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id' => $companyId,
                'actor_user_id' => $userId,
                'event_type' => 'synthetic_receipt.encrypted_envelope_received',
                'entity_type' => 'synthetic_receipt',
                'entity_id' => $documentId,
                'metadata' => json_encode([
                    'client_event_id' => $eventId, 'version' => $version,
                    'sha256' => $digest, 'demo_only' => true,
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            return $this->acknowledge($companyId, $documentId, $version, false);
        });
    }

    private function acknowledge(int $companyId, string $documentId, int $version,
        bool $duplicate): array
    {
        return [
            'company_id' => $companyId,
            'document_id' => $documentId,
            'version' => $version,
            'already_received' => $duplicate,
            'encrypted_demo_envelope_stored' => true,
            'business_document_created' => false,
            'real_sync_enabled' => false,
            'demo_only' => true,
        ];
    }
}
