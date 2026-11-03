<?php

namespace App\Application\TaxIntegration;

use App\Domain\TaxIntegration\TaxEnvironment;
use App\Infrastructure\Integrations\Tax\EdavkiSoapClient;
use Illuminate\Support\Facades\DB;

final class SyncTaxSubmissionStatus
{
    public function __construct(private EdavkiSoapClient $client) {}

    public function execute(int $submissionId): string
    {
        $submission = DB::table('tax_submissions')->find($submissionId);
        if (! $submission || ! $submission->remote_document_id) {
            throw new \DomainException('Submission has no remote document ID.');
        }

        $profile = DB::table('tax_integration_profiles')->find($submission->tax_integration_profile_id);
        if (! $profile || ! $profile->active || $profile->environment !== $submission->environment) {
            throw new \DomainException('Invalid tax integration profile.');
        }

        $environment = TaxEnvironment::from($submission->environment);
        $response = $this->client->status($environment->endpoint(), $submission->remote_document_id, [
            'taxpayer_number' => $profile->taxpayer_number,
        ]);

        $remoteStatus = (string) ($response['status'] ?? 'unknown');
        $localStatus = $this->mapStatus($remoteStatus);

        DB::transaction(function () use ($submissionId, $remoteStatus, $localStatus, $response) {
            DB::table('tax_submissions')->where('id', $submissionId)->update([
                'status' => $localStatus,
                'remote_status' => $remoteStatus,
                'last_checked_at' => now(),
                'last_response_meta' => json_encode(array_intersect_key($response, array_flip([
                    'status', 'message_code', 'message',
                ]))),
                'updated_at' => now(),
            ]);

            DB::table('tax_submission_status_events')->insert([
                'tax_submission_id' => $submissionId,
                'remote_status' => $remoteStatus,
                'local_status' => $localStatus,
                'payload_meta' => json_encode(array_intersect_key($response, array_flip([
                    'message_code', 'message',
                ]))),
                'observed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        return $localStatus;
    }

    private function mapStatus(string $remote): string
    {
        $normalized = strtolower(trim($remote));

        return match (true) {
            in_array($normalized, ['accepted', 'submitted', 'success', 'processed'], true) => 'accepted',
            in_array($normalized, ['rejected', 'invalid', 'error'], true) => 'rejected',
            in_array($normalized, ['processing', 'pending', 'queued', 'uploaded'], true) => 'processing',
            default => 'processing',
        };
    }
}
