<?php

namespace App\Application\TaxIntegration;

use Illuminate\Support\Facades\DB;

final class PrepareTaxSubmission
{
    public function execute(
        int $companyId,
        int $profileId,
        string $documentType,
        string $sourceType,
        int $sourceId,
        string $environment,
        string $artifactPath,
        string $artifactSha256,
        int $userId,
    ): int {
        if (! in_array($environment, ['test', 'production'], true)) {
            throw new \DomainException('Invalid tax environment.');
        }

        if (! preg_match('/^[a-f0-9]{64}$/i', $artifactSha256)) {
            throw new \DomainException('Invalid tax artifact SHA-256.');
        }

        return DB::transaction(function () use (
            $companyId, $profileId, $documentType, $sourceType, $sourceId,
            $environment, $artifactPath, $artifactSha256, $userId
        ) {
            $profile = DB::table('tax_integration_profiles')->find($profileId);
            if (! $profile || $profile->company_id !== $companyId || $profile->environment !== $environment) {
                throw new \DomainException('Tax integration profile mismatch.');
            }

            $idempotencyKey = hash('sha256', implode('|', [
                $companyId, $documentType, $sourceType, $sourceId, $environment, strtolower($artifactSha256),
            ]));

            $existing = DB::table('tax_submissions')
                ->where('company_id', $companyId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                return (int) $existing->id;
            }

            return DB::table('tax_submissions')->insertGetId([
                'company_id' => $companyId,
                'tax_integration_profile_id' => $profileId,
                'document_type' => $documentType,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'environment' => $environment,
                'idempotency_key' => $idempotencyKey,
                'status' => 'prepared',
                'artifact_sha256' => strtolower($artifactSha256),
                'artifact_path' => $artifactPath,
                'created_by' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }
}
