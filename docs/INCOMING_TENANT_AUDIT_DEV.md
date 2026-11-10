# FINAI INCOMING-TENANT-01 — company scoping and audit

Scope: **FinAI only**, GitHub development with synthetic data. No Hiper M, STNG or Laškoteka host writes.

## Finished in this slice

- The incoming-invoice browser demo now receives the selected company ID from the top-level selector. Every fixture, created invoice, selection and filter is company-scoped. Changing company does not expose the prior company's records.
- Demo invoice IDs contain their company ID, and duplicate supplier/number checks operate within a company.
- Demo approval is rejected across company boundaries and cannot be repeated. Reset only affects the current company's demo records.
- A lightweight activity list shows only the current company's creation/approval/reset events. It is **in-memory and not a durable, tamper-resistant audit log**.
- Laravel's existing `ApproveIncomingInvoice` service now requires an authenticated server-side company ID, an active verified user with active company membership and explicit `invoices.approve` role permission. Owner/Admin also need completed 2FA. It verifies the invoice, original document, partner and line account links all belong to the same company before a single transactional approval and append to the existing `audit_logs` schema.
- The backend service is **not yet exposed as a live HTTP endpoint** and is **not connected to the browser demo**. The real invoice database migrations are not production-approved; tests construct an isolated synthetic SQLite subset.
- The real authorization must be enforced in authenticated API controllers and persisted database queries, never only with browser filtering. This slice strengthens the service, but does not authorize use of real financial data.

## Targeted QA

- `node --test tests/demoIncoming.test.mjs`
- `php artisan test --filter=IncomingInvoiceTenantApprovalTest` under backend's existing SQLite-only test environment (plus existing identity checks via normal Laravel CI)
- One Playwright scenario on desktop and mobile testing company switching, approval, per-company reset and session expiration
- Next.js static build and SHA256 integrity test via existing workflow

Do not activate Hiper M production/database writes as part of this work. Deployment flags stay disabled until dedicated FinAI OS/cPanel isolation is verified and approved.
