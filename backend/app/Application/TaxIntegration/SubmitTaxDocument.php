<?php

namespace App\Application\TaxIntegration;

use App\Domain\TaxIntegration\TaxEnvironment;
use App\Infrastructure\Integrations\Tax\EdavkiSoapClient;
use App\Infrastructure\Integrations\Tax\XmlDocumentSigner;
use App\Infrastructure\Integrations\Tax\XmlSchemaValidator;
use Illuminate\Support\Facades\DB;

final class SubmitTaxDocument
{
    public function __construct(
        private EdavkiSoapClient $client,
        private XmlDocumentSigner $signer,
        private XmlSchemaValidator $validator,
    ) {}

    public function execute(int $submissionId, int $userId, string $xml): void
    {
        DB::transaction(function () use ($submissionId) {
            $submission = DB::table('tax_submissions')->lockForUpdate()->find($submissionId);
            if (! $submission || ! in_array($submission->status, ['prepared', 'failed'], true)) {
                throw new \DomainException('Tax submission is not available for submission.');
            }

            $profile = DB::table('tax_integration_profiles')->find($submission->tax_integration_profile_id);
            if (! $profile || ! $profile->active) {
                throw new \DomainException('Tax integration profile is not active.');
            }

            if ($submission->environment !== $profile->environment) {
                throw new \DomainException('Submission environment does not match integration profile.');
            }

            if (! $profile->certificate_reference) {
                throw new \DomainException('Signing certificate reference is missing.');
            }

            DB::table('tax_submissions')->where('id', $submissionId)->update([
                'status' => 'queued',
                'attempt_no' => $submission->attempt_no + 1,
                'updated_at' => now(),
            ]);
        });

        $submission = DB::table('tax_submissions')->find($submissionId);
        $profile = DB::table('tax_integration_profiles')->find($submission->tax_integration_profile_id);
        $attemptNo = (int) $submission->attempt_no;

        DB::table('tax_submission_attempts')->insert([
            'tax_submission_id' => $submissionId,
            'attempt_no' => $attemptNo,
            'operation' => 'submit',
            'status' => 'started',
            'started_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $validation = $this->validator->validate($submission->document_type, $xml);
            if (! ($validation['valid'] ?? false)) {
                throw new \DomainException('XML schema validation failed.');
            }

            $signedXml = $this->signer->sign($xml, $profile->certificate_reference);
            $environment = TaxEnvironment::from($submission->environment);

            $response = $this->client->submit($environment->endpoint(), $signedXml, [
                'taxpayer_number' => $profile->taxpayer_number,
                'idempotency_key' => $submission->idempotency_key,
                'document_type' => $submission->document_type,
            ]);

            if (empty($response['remote_document_id'])) {
                throw new \RuntimeException('eDavki response did not contain a remote document ID.');
            }

            DB::transaction(function () use ($submissionId, $attemptNo, $response, $userId) {
                $submission = DB::table('tax_submissions')->lockForUpdate()->find($submissionId);

                DB::table('tax_submissions')->where('id', $submissionId)->update([
                    'status' => 'submitted',
                    'remote_document_id' => $response['remote_document_id'],
                    'remote_status' => $response['status'] ?? null,
                    'last_response_meta' => json_encode($this->safeMeta($response)),
                    'last_error' => null,
                    'submitted_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('tax_submission_attempts')
                    ->where('tax_submission_id', $submissionId)
                    ->where('attempt_no', $attemptNo)
                    ->where('operation', 'submit')
                    ->update([
                        'status' => 'success',
                        'response_meta' => json_encode($this->safeMeta($response)),
                        'finished_at' => now(),
                        'updated_at' => now(),
                    ]);

                DB::table('audit_logs')->insert([
                    'company_id' => $submission->company_id,
                    'actor_user_id' => $userId,
                    'event_type' => 'tax_submission.submitted',
                    'entity_type' => 'tax_submission',
                    'entity_id' => (string) $submissionId,
                    'metadata' => json_encode([
                        'environment' => $submission->environment,
                        'document_type' => $submission->document_type,
                        'remote_document_id' => $response['remote_document_id'],
                    ]),
                    'created_at' => now(),
                ]);
            });
        } catch (\Throwable $e) {
            DB::transaction(function () use ($submissionId, $attemptNo, $e) {
                DB::table('tax_submissions')->where('id', $submissionId)->update([
                    'status' => 'failed',
                    'last_error' => mb_substr($e->getMessage(), 0, 4000),
                    'updated_at' => now(),
                ]);

                DB::table('tax_submission_attempts')
                    ->where('tax_submission_id', $submissionId)
                    ->where('attempt_no', $attemptNo)
                    ->where('operation', 'submit')
                    ->update([
                        'status' => 'failed',
                        'message' => mb_substr($e->getMessage(), 0, 4000),
                        'finished_at' => now(),
                        'updated_at' => now(),
                    ]);
            });

            throw $e;
        }
    }

    private function safeMeta(array $response): array
    {
        return array_intersect_key($response, array_flip([
            'remote_document_id', 'status', 'message_code', 'message',
        ]));
    }
}
