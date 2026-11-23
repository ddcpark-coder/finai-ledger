<?php

namespace App\Application\Documents;

use Illuminate\Support\Facades\DB;

/**
 * NEXT32: local/testing-only signed receipt for an accepted synthetic Windows
 * AES-GCM envelope. Uses an operator-provisioned RSA >=2048 private key kept
 * outside the public document root; no key or token is shipped in GitHub.
 * No real document, journal or production transmission is authorized.
 */
final class SyntheticWindowsAckSigner
{
    private const FORMAT = 'finai-windows-synthetic-ack-v1';
    private const ENVELOPE_FORMAT = 'finai-windows-synthetic-outbox-v1';

    private function privateKey(): \OpenSSLAsymmetricKey
    {
        abort_unless(app()->environment(['local', 'testing'])
            && config('finai.synthetic_receipt_sync_enabled', false)
            && config('finai.synthetic_windows_ack_enabled', false), 404);

        $root = realpath(storage_path('app/finai-next32-signing'));
        $configured = config('finai.synthetic_windows_ack_private_key_path', '');
        $path = is_string($configured) && $configured !== '' ? realpath($configured) : false;
        abort_unless($root && $path
            && str_starts_with($path, $root.DIRECTORY_SEPARATOR)
            && ! is_link($configured) && is_file($path)
            && filesize($path) > 500 && filesize($path) <= 10000
            && (fileperms($path) & 0077) === 0, 404);

        $pem = file_get_contents($path);
        abort_unless(is_string($pem), 404);
        $key = openssl_pkey_get_private($pem);
        $details = $key ? openssl_pkey_get_details($key) : false;
        abort_unless($details && $details['type'] === OPENSSL_KEYTYPE_RSA
            && $details['bits'] >= 2048, 404);
        return $key;
    }

    public function assertAvailable(): void
    {
        $this->privateKey(); // fail before writing a Windows event
    }

    private static function fingerprint(string $publicPem): string
    {
        $encoded = preg_replace('/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/', '', $publicPem);
        $der = $encoded !== null ? base64_decode($encoded, true) : false;
        if ($der === false || strlen($der) < 200)
            throw new \DomainException('No valid synthetic signer public key.');
        return hash('sha256', $der);
    }

    /**
     * Invariant, versioned ASCII representation consumed by the Windows
     * RSA.VerifyData(SHA256,Pkcs1) verifier. All fields are signed.
     */
    public static function canonical(array $receipt): string
    {
        return implode("\n", [
            self::FORMAT,
            (string) $receipt['companyId'],
            $receipt['documentId'],
            $receipt['clientEventId'],
            (string) $receipt['expectedVersion'],
            (string) $receipt['version'],
            $receipt['ciphertextSha256'],
            (string) $receipt['serverUserId'],
            'true', 'false', 'false',
            $receipt['keyFingerprint'],
        ])."\n";
    }

    public function sign(int $userId, int $companyId, string $documentId,
        string $eventId, int $expectedVersion, array $envelope): array
    {
        $private = $this->privateKey();
        abort_unless(($envelope['format'] ?? '') === self::ENVELOPE_FORMAT, 422);
        $row = DB::table('synthetic_receipt_sync_events')
            ->where('user_id', $userId)->where('company_id', $companyId)
            ->where('document_id', $documentId)->where('client_event_id', $eventId)
            ->first(['version', 'payload_sha256']);
        abort_unless($row && (int) $row->version === $expectedVersion + 1, 409);

        $json = json_encode($envelope, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        abort_unless(hash_equals($row->payload_sha256, hash('sha256', $json)), 409);
        $cipher = base64_decode((string) ($envelope['ciphertext'] ?? ''), true);
        abort_unless($cipher !== false && strlen($cipher) >= 32, 422);

        $details = openssl_pkey_get_details($private);
        if (! $details || ! isset($details['key']))
            throw new \DomainException('Synthetic signer not available.');
        $receipt = [
            'format' => self::FORMAT,
            'companyId' => $companyId,
            'documentId' => $documentId,
            'clientEventId' => $eventId,
            'expectedVersion' => $expectedVersion,
            'version' => (int) $row->version,
            'ciphertextSha256' => hash('sha256', $cipher),
            'serverUserId' => $userId,
            'demoOnly' => true,
            'businessDocumentCreated' => false,
            'realSyncEnabled' => false,
            'keyFingerprint' => self::fingerprint($details['key']),
        ];
        $signature = '';
        if (! openssl_sign(self::canonical($receipt), $signature,
            $private, OPENSSL_ALGO_SHA256)) {
            throw new \DomainException('Synthetic signer refused receipt.');
        }
        return [...$receipt, 'signature' => base64_encode($signature)];
    }
}
