<?php

namespace App\Application\IncomingInvoices;

use App\Application\Accounting\PreviewSyntheticDraftJournal;
use App\Domain\Accounting\BalanceCalculator;
use Illuminate\Support\Facades\DB;

/**
 * NEXT29: human-confirmed SYNTHETIC invoice + proposal + REAL-SCHEMA draft.
 * Test/local only. Not a posting engine; never creates or posts a journal.
 * No public route or automatic approval. Real business data is forbidden.
 */
final class SyntheticApprovedInvoiceJournalWorkflow
{
    private static function requireLocal(): void
    {
        if (! app()->environment('local', 'testing')
            || ! config('finai.synthetic_approved_invoice_workflow_enabled', false)
            || ! config('finai.synthetic_journal_preview_enabled', false)) {
            throw new \DomainException('Synthetic invoice workflow is disabled.');
        }
    }

    private static function requireApprover(int $companyId, int $userId): void
    {
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
                $query->whereNotIn('roles.key', ['owner','admin'])
                    ->orWhereNotNull('users.two_factor_confirmed_at');
            })
            ->exists();
        if (! $allowed) {
            throw new \DomainException('User cannot review synthetic invoices for this company.');
        }
    }

    private static function approvedInvoice(int $companyId, int $invoiceId): object
    {
        $invoice = DB::table('incoming_invoices')
            ->where('company_id', $companyId)->where('id', $invoiceId)->first();
        if (! $invoice || $invoice->status !== 'approved'
            || ! is_string($invoice->invoice_number)
            || ! preg_match('/^SYN-INV-[0-9]{1,12}$/D', $invoice->invoice_number)
            || $invoice->currency !== 'EUR'
            || ! $invoice->approved_by || ! $invoice->approved_at
            || ! $invoice->journal_id || ! $invoice->document_id || ! $invoice->partner_id
            || ! DB::table('documents')->where('id', $invoice->document_id)
                ->where('company_id', $companyId)->exists()
            || ! DB::table('partners')->where('id', $invoice->partner_id)
                ->where('company_id', $companyId)->exists()) {
            throw new \DomainException('Only approved, linked synthetic invoices are allowed.');
        }
        self::requireApprover($companyId, (int) $invoice->approved_by);
        return $invoice;
    }

    private static function draftPreview(object $invoice, int $companyId,
        int $userId, PreviewSyntheticDraftJournal $drafts): array
    {
        $journal = DB::table('journals')->where('id', $invoice->journal_id)
            ->where('company_id', $companyId)
            ->where('document_ref', $invoice->invoice_number)
            ->where('status', 'draft')->first();
        if (! $journal)
            throw new \DomainException('No matching draft journal for the synthetic invoice.');
        $preview = $drafts->execute($companyId, (int) $journal->id, $userId);
        $gross = BalanceCalculator::toCents((string) $invoice->gross_amount);
        if ($gross <= 0 || $gross !== $preview['totalDebitCents']
            || $gross !== $preview['totalCreditCents']
            || $preview['reference'] !== $invoice->invoice_number
            || $preview['postingAllowed'] !== false) {
            throw new \DomainException('Synthetic invoice totals do not match the draft.');
        }
        return $preview;
    }

    private static function validateProposal(object $proposal, object $invoice,
        array $preview): void
    {
        if ($proposal->provider !== 'synthetic-qa') {
            throw new \DomainException('Only explicit synthetic proposals may be accepted.');
        }
        try {
            $value = json_decode((string) $proposal->proposal_json, true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new \DomainException('Invalid synthetic proposal.', previous: $e);
        }
        if (! is_array($value) || count($value) !== 5
            || ($value['demoOnly'] ?? null) !== true
            || ($value['postingAllowed'] ?? null) !== false
            || ($value['currency'] ?? null) !== 'EUR'
            || ($value['reference'] ?? null) !== $invoice->invoice_number
            || ($value['lines'] ?? null) !== $preview['lines']) {
            throw new \DomainException('Synthetic proposal and journal preview disagree.');
        }
    }

    /**
     * Human-triggered application action, no HTTP API.
     * Calls the same real-schema checks used by the read-only journal preview.
     * Only marks an already approved SYNTHETIC proposal as accepted, with audit.
     */
    public function acceptProposal(int $companyId, int $invoiceId, int $proposalId,
        int $userId, PreviewSyntheticDraftJournal $drafts): void
    {
        self::requireLocal();
        DB::transaction(function () use ($companyId, $invoiceId, $proposalId,
            $userId, $drafts): void {
            self::requireApprover($companyId, $userId);
            $invoice = self::approvedInvoice($companyId, $invoiceId);
            $preview = self::draftPreview($invoice, $companyId, $userId, $drafts);
            $proposal = DB::table('accounting_proposals')
                ->where('id', $proposalId)->where('incoming_invoice_id', $invoiceId)
                ->where('status', 'proposed')->lockForUpdate()->first();
            if (! $proposal)
                throw new \DomainException('Only a pending proposal can be manually accepted.');
            self::validateProposal($proposal, $invoice, $preview);
            if (DB::table('accounting_proposals')
                ->where('incoming_invoice_id', $invoiceId)
                ->where('status', 'accepted')->exists()) {
                throw new \DomainException('The invoice already has an accepted proposal.');
            }
            $count = DB::table('accounting_proposals')->where('id', $proposalId)
                ->where('incoming_invoice_id', $invoiceId)
                ->where('status', 'proposed')->update([
                    'status' => 'accepted', 'reviewed_by' => $userId,
                    'reviewed_at' => now(), 'updated_at' => now(),
                ]);
            if ($count !== 1)
                throw new \DomainException('Concurrent synthetic proposal review rejected.');
            DB::table('audit_logs')->insert([
                'company_id' => $companyId, 'actor_user_id' => $userId,
                'event_type' => 'synthetic_invoice.proposal_accepted',
                'entity_type' => 'accounting_proposal',
                'entity_id' => (string) $proposalId,
                'metadata' => json_encode([
                    'demo_only' => true,
                    'invoice_id' => $invoiceId,
                    'posting' => false,
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
        }, 1);
    }

    /**
     * Strictly read-only. Approval and proposal review must already be recorded.
     * Not an authorization to call PostJournal and not a public endpoint.
     */
    public function preview(int $companyId, int $invoiceId, int $userId,
        PreviewSyntheticDraftJournal $drafts): array
    {
        self::requireLocal();
        self::requireApprover($companyId, $userId);
        return DB::transaction(function () use ($companyId, $invoiceId,
            $userId, $drafts): array {
            $invoice = self::approvedInvoice($companyId, $invoiceId);
            $proposal = DB::table('accounting_proposals')
                ->where('incoming_invoice_id', $invoiceId)
                ->where('status', 'accepted')->get();
            if ($proposal->count() !== 1 || ! $proposal[0]->reviewed_by
                || ! $proposal[0]->reviewed_at) {
                throw new \DomainException('A reviewed synthetic proposal is required.');
            }
            self::requireApprover($companyId, (int) $proposal[0]->reviewed_by);
            $draft = self::draftPreview($invoice, $companyId, $userId, $drafts);
            self::validateProposal($proposal[0], $invoice, $draft);

            return [
                'companyId' => $companyId,
                'invoiceId' => $invoiceId,
                'proposalId' => (int) $proposal[0]->id,
                'journalId' => (int) $invoice->journal_id,
                'reference' => $invoice->invoice_number,
                'currency' => 'EUR',
                'approved' => true,
                'proposalReviewed' => true,
                'totalDebitCents' => $draft['totalDebitCents'],
                'totalCreditCents' => $draft['totalCreditCents'],
                'lines' => $draft['lines'],
                'postingAllowed' => false,
                'mode' => 'synthetic-invoice-review-only',
            ];
        }, 1);
    }
}
