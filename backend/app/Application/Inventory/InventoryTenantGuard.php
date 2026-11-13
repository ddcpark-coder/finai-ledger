<?php

namespace App\Application\Inventory;

use App\Domain\Identity\Permission;
use Illuminate\Support\Facades\DB;

final class InventoryTenantGuard
{
    public static function requireWriter(int $companyId, int $userId): void
    {
        $allowed = DB::table('company_user as membership')
            ->join('users as user', 'user.id', '=', 'membership.user_id')
            ->join('companies as company', 'company.id', '=', 'membership.company_id')
            ->join('roles as role', 'role.id', '=', 'membership.role_id')
            ->join('permission_role as assignment', 'assignment.role_id', '=', 'role.id')
            ->join('permissions as permission', 'permission.id', '=', 'assignment.permission_id')
            ->where('membership.company_id', $companyId)
            ->where('membership.user_id', $userId)
            ->where('membership.status', 'active')
            ->where('user.active', true)->whereNotNull('user.email_verified_at')
            ->where('company.active', true)
            ->where('permission.key', Permission::InventoryWrite->value)
            ->exists();
        if (! $allowed) {
            throw new \DomainException('User cannot modify stock in this company.');
        }
    }
}
