<?php

namespace App\Application\Accounting;

use App\Domain\Accounting\BalanceCalculator;
use App\Domain\Identity\Permission;
use Illuminate\Support\Facades\DB;

final class LedgerPostingGuard
{
    public static function requireWriter(int $companyId, int $userId): void
    {
        // Mandatory even for application-service calls outside an HTTP controller.
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
            ->where('permission.key', Permission::LedgerPost->value)
            ->exists();
        if (! $allowed) {
            throw new \DomainException('User cannot post journals in this company.');
        }
    }

    public static function openPeriod(int $companyId, int $yearId, int $periodId): object
    {
        $year = DB::table('fiscal_years')->where('id', $yearId)
            ->where('company_id', $companyId)->where('status', 'open')->first();
        if (! $year) {
            throw new \DomainException('Fiscal year is closed or belongs to another company.');
        }
        $period = DB::table('accounting_periods')->where('id', $periodId)
            ->where('fiscal_year_id', $yearId)
            ->lockForUpdate()->first();
        if (! $period || $period->status !== 'open'
            || $period->starts_on < $year->starts_on
            || $period->ends_on > $year->ends_on) {
            throw new \DomainException('Accounting period is closed or belongs to another fiscal year.');
        }
        return $period;
    }

    public static function journalEntries(int $companyId, int $journalId): array
    {
        $entries = DB::table('journal_entries')
            ->where('journal_id', $journalId)->orderBy('line_no')->get()->all();
        $amounts = [];
        foreach ($entries as $line) {
            $account = DB::table('accounts')->where('id', $line->account_id)
                ->where('company_id', $companyId)
                ->where('active', true)->where('postable', true)->exists();
            if (! $account) {
                throw new \DomainException('Journal account is not active and postable in this company.');
            }
            if ($line->cost_center_id && ! DB::table('cost_centers')
                ->where('id', $line->cost_center_id)
                ->where('company_id', $companyId)->where('active', true)->exists()) {
                throw new \DomainException('Foreign or inactive cost center on journal line.');
            }
            if ($line->tax_code_id && ! DB::table('tax_codes')
                ->where('id', $line->tax_code_id)
                ->where('company_id', $companyId)->where('active', true)->exists()) {
                throw new \DomainException('Foreign or inactive tax code on journal line.');
            }
            $amounts[] = ['debit' => $line->debit, 'credit' => $line->credit];
        }
        BalanceCalculator::assertBalanced($amounts);
        return $entries;
    }
}
