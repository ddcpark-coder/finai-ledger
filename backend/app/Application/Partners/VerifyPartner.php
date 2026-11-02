<?php

namespace App\Application\Partners;

use App\Infrastructure\Integrations\Partners\PartnerRegistryVerifier;
use App\Infrastructure\Integrations\Partners\VatNumberVerifier;
use Illuminate\Support\Facades\DB;

final class VerifyPartner
{
    public function __construct(
        private PartnerRegistryVerifier $registry,
        private VatNumberVerifier $vat,
    ) {}

    public function execute(int $partnerId, int $userId): array
    {
        $partner = DB::table('partners')->find($partnerId);
        if (! $partner) {
            throw new \DomainException('Partner not found.');
        }

        $registryResult = $this->registry->verifyCompany(
            $partner->country_code,
            $partner->registration_number,
            $partner->tax_number,
        );

        $vatResult = $partner->vat_id
            ? $this->vat->verify($partner->vat_id)
            : ['checked' => false, 'valid' => null];

        $registryOk = (bool) ($registryResult['valid'] ?? $registryResult['found'] ?? false);
        $vatChecked = (bool) ($vatResult['checked'] ?? false);
        $vatValid = $vatResult['valid'] ?? null;
        $verificationStatus = $registryOk && (! $vatChecked || $vatValid === true)
            ? 'verified'
            : 'review';

        DB::table('partners')->where('id', $partnerId)->update([
            'last_checked_at' => now(),
            'verification_status' => $verificationStatus,
            'verification_source' => $partner->country_code === 'SI' ? 'registry+vat' : 'vat',
            'updated_at' => now(),
        ]);

        DB::table('audit_logs')->insert([
            'company_id' => $partner->company_id,
            'actor_user_id' => $userId,
            'event_type' => 'partner.verified',
            'entity_type' => 'partner',
            'entity_id' => (string) $partnerId,
            'metadata' => json_encode([
                'registry_checked' => (bool) ($registryResult['checked'] ?? false),
                'vat_checked' => (bool) ($vatResult['checked'] ?? false),
                'vat_valid' => $vatResult['valid'] ?? null,
            ]),
            'created_at' => now(),
        ]);

        return ['registry' => $registryResult, 'vat' => $vatResult];
    }
}
