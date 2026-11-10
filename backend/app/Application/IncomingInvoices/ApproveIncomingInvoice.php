<?php

namespace App\Application\IncomingInvoices;

use App\Domain\IncomingInvoices\IncomingInvoiceValidator;
use Illuminate\Support\Facades\DB;

final class ApproveIncomingInvoice
{
    // Company context and actor identity must originate from authenticated server-side context.
    // Never approve an invoice by an unscoped global ID.
    public function execute(int $companyId, int $invoiceId, int $userId): void
    {
        DB::transaction(function () use ($companyId, $invoiceId, $userId): void {
            $allowed = DB::table('company_user as membership')
                ->join('companies', 'companies.id', '=', 'membership.company_id')
                ->join('users', 'users.id', '=', 'membership.user_id')
                ->join('roles', 'roles.id', '=', 'membership.role_id')
                ->join('permission_role', 'permission_role.role_id', '=', 'roles.id')
                ->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')
                ->where('membership.company_id', $companyId)
                ->where('membership.user_id', $userId)
                ->where('membership.status', 'active')
                ->where('companies.active', true)
                ->where('users.active', true)
                ->whereNotNull('users.email_verified_at')
                ->where('permissions.key', 'invoices.approve')
                ->where(function ($query): void {
                    $query->whereNotIn('roles.key', ['owner', 'admin'])
                        ->orWhereNotNull('users.two_factor_confirmed_at');
                })
                ->exists();

            if (! $allowed) {
                throw new \DomainException('Actor cannot approve incoming invoices for this company.');
            }

            $invoice = DB::table('incoming_invoices')
                ->where('company_id', $companyId)
                ->where('id', $invoiceId)
                ->lockForUpdate()
                ->first();

            if (! $invoice || $invoice->status !== 'review') {
                throw new \DomainException('Only review invoices belonging to this company can be approved.');
            }

            if (! DB::table('documents')
                ->where('id', $invoice->document_id)
                ->where('company_id', $companyId)->exists()) {
                throw new \DomainException('Invoice document belongs to another company.');
            }

            if ($invoice->partner_id !== null && ! DB::table('partners')
                ->where('id', $invoice->partner_id)
                ->where('company_id', $companyId)->exists()) {
                throw new \DomainException('Invoice partner belongs to another company.');
            }

            IncomingInvoiceValidator::assertReadyForApproval((array) $invoice);
            $lines = DB::table('incoming_invoice_lines')
                ->where('incoming_invoice_id', $invoiceId)
                ->orderBy('line_no')
                ->get()
                ->map(fn ($line): array => (array) $line)
                ->all();

            IncomingInvoiceValidator::assertTotals((array) $invoice, $lines);

            foreach ($lines as $line) {
                foreach ([
                    'suggested_account_id' => 'accounts',
                    'cost_center_id' => 'cost_centers',
                    'tax_code_id' => 'tax_codes',
                ] as $column => $table) {
                    if (! empty($line[$column]) && ! DB::table($table)
                        ->where('id', $line[$column])
                        ->where('company_id', $companyId)->exists()) {
                        throw new \DomainException('Invoice line references a different company.');
                    }
                }
            }

            $changed = DB::table('incoming_invoices')
                ->where('company_id', $companyId)
                ->where('id', $invoiceId)
                ->where('status', 'review')
                ->update([
                    'status' => 'approved',
                    'approved_by' => $userId,
                    'approved_at' => now(),
                    'updated_at' => now(),
                ]);
            if ($changed !== 1) {
                throw new \DomainException('Incoming invoice approval was not committed.');
            }

            DB::table('audit_logs')->insert([
                'company_id' => $companyId,
                'actor_user_id' => $userId,
                'event_type' => 'incoming_invoice.approved',
                'entity_type' => 'incoming_invoice',
                'entity_id' => (string) $invoiceId,
                'metadata' => json_encode(['invoice_number' => $invoice->invoice_number]),
                'created_at' => now(),
            ]);
        });
    }
}
