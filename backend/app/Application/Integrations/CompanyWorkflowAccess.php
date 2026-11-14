<?php

namespace App\Application\Integrations;

use Illuminate\Support\Facades\DB;

final class CompanyWorkflowAccess
{
    public static function requirePermission(int $companyId, int $actorId,
        string $permission): void
    {
        $allowed = DB::table('company_user as membership')
            ->join('users as user','user.id','=','membership.user_id')
            ->join('companies as company','company.id','=','membership.company_id')
            ->join('permission_role as assignment','assignment.role_id','=','membership.role_id')
            ->join('permissions as permission','permission.id','=','assignment.permission_id')
            ->where('membership.company_id',$companyId)
            ->where('membership.user_id',$actorId)
            ->where('membership.status','active')
            ->where('user.active',true)->whereNotNull('user.email_verified_at')
            ->where('company.active',true)
            ->where('permission.key',$permission)->exists();
        if(! $allowed)throw new \DomainException('Company permission required.');
    }
}
