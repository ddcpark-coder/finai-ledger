<?php

namespace App\Application\Partners;

use App\Domain\Partners\PartnerValidator;
use Illuminate\Support\Facades\DB;

final class AddPartnerBankAccount
{
    public function execute(int $partnerId, int $userId, string $iban, ?string $bic = null, bool $primary = false): int
    {
        $normalizedIban = PartnerValidator::normalizeIban($iban);

        if (! preg_match('/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/', $normalizedIban)) {
            throw new \DomainException('Invalid IBAN format.');
        }

        return DB::transaction(function () use ($partnerId, $userId, $normalizedIban, $bic, $primary) {
            $partner = DB::table('partners')->find($partnerId);
            if (! $partner) {
                throw new \DomainException('Partner not found.');
            }

            if ($primary) {
                DB::table('partner_bank_accounts')->where('partner_id', $partnerId)->update(['primary' => false]);
            }

            $id = DB::table('partner_bank_accounts')->insertGetId([
                'partner_id' => $partnerId,
                'iban' => $normalizedIban,
                'bic' => $bic ? strtoupper(trim($bic)) : null,
                'primary' => $primary,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $partner->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'partner.bank_account_added',
                'entity_type' => 'partner',
                'entity_id' => (string) $partnerId,
                'metadata' => json_encode(['bank_account_id' => $id, 'iban_last4' => substr($normalizedIban, -4)]),
                'created_at' => now(),
            ]);

            return $id;
        });
    }
}
