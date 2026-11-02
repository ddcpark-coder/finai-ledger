<?php

namespace App\Application\Partners;

use App\Domain\Partners\PartnerValidator;
use Illuminate\Support\Facades\DB;

final class CreatePartner
{
    public function execute(int $companyId, int $userId, array $data): int
    {
        PartnerValidator::assertBasicIdentity($data);

        return DB::transaction(function () use ($companyId, $userId, $data) {
            $taxNumber = PartnerValidator::normalizeTaxNumber($data['tax_number'] ?? null);
            $vatId = PartnerValidator::normalizeVatId($data['vat_id'] ?? null);

            if ($taxNumber) {
                $duplicate = DB::table('partners')
                    ->where('company_id', $companyId)
                    ->where('tax_number', $taxNumber)
                    ->where('status', '<>', 'archived')
                    ->exists();

                if ($duplicate) {
                    throw new \DomainException('Partner with this tax number already exists.');
                }
            }

            $partnerId = DB::table('partners')->insertGetId([
                'company_id' => $companyId,
                'type' => $data['type'] ?? 'company',
                'name' => trim($data['name']),
                'short_name' => $data['short_name'] ?? null,
                'registration_number' => $data['registration_number'] ?? null,
                'tax_number' => $taxNumber,
                'vat_id' => $vatId,
                'vat_registered' => (bool) ($data['vat_registered'] ?? false),
                'country_code' => strtoupper($data['country_code'] ?? 'SI'),
                'currency' => strtoupper($data['currency'] ?? 'EUR'),
                'payment_terms_days' => (int) ($data['payment_terms_days'] ?? 15),
                'status' => 'active',
                'risk_level' => 'normal',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $companyId,
                'actor_user_id' => $userId,
                'event_type' => 'partner.created',
                'entity_type' => 'partner',
                'entity_id' => (string) $partnerId,
                'metadata' => json_encode(['name' => trim($data['name'])]),
                'created_at' => now(),
            ]);

            return $partnerId;
        });
    }
}
