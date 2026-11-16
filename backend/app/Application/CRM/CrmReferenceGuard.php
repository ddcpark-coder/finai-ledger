<?php

namespace App\Application\CRM;

use App\Application\Integrations\CompanyWorkflowAccess;
use Illuminate\Support\Facades\DB;

final class CrmReferenceGuard
{
    public static function permission(int $companyId, int $actorId, string $operation): void
    {
        CompanyWorkflowAccess::requirePermission($companyId, $actorId, 'crm.'.$operation);
    }

    public static function leadReferences(int $companyId, object $lead): void
    {
        if ($lead->partner_id !== null &&
            ! DB::table('partners')->where('id', $lead->partner_id)
                ->where('company_id', $companyId)->exists()) {
            throw new \DomainException('CRM partner belongs to another company.');
        }
        if ($lead->contact_id !== null) {
            $contact = DB::table('crm_contacts')->where('id', $lead->contact_id)
                ->where('company_id', $companyId)->first();
            if (! $contact ||
                ($lead->partner_id !== null && $contact->partner_id !== null
                    && (int) $contact->partner_id !== (int) $lead->partner_id)) {
                throw new \DomainException('CRM contact belongs to another company or partner.');
            }
        }
        if ($lead->owner_user_id !== null &&
            ! DB::table('company_user as membership')
                ->join('users', 'users.id', '=', 'membership.user_id')
                ->where('membership.company_id', $companyId)
                ->where('membership.user_id', $lead->owner_user_id)
                ->where('membership.status', 'active')
                ->where('users.active', true)->whereNotNull('users.email_verified_at')
                ->exists()) {
            throw new \DomainException('CRM owner must be an active member of this company.');
        }
    }

    public static function activeUnit(int $companyId, int $unitId): void
    {
        if (! DB::table('business_units')->where('id', $unitId)
            ->where('company_id', $companyId)->where('active', true)->exists()) {
            throw new \DomainException('Business unit must belong to the active company.');
        }
    }

    public static function linkedUnit(int $companyId, int $opportunityId,
        int $businessUnitId): void
    {
        self::activeUnit($companyId, $businessUnitId);
        if (! DB::table('crm_opportunity_business_units')
            ->where('company_id', $companyId)
            ->where('opportunity_id', $opportunityId)
            ->where('business_unit_id', $businessUnitId)->exists()) {
            throw new \DomainException('CRM opportunity does not belong to this business unit.');
        }
    }
}
