# FinAI / Ledger — mandatory repository agent instructions (Project rules C, 2026-11-23)

These rules apply to EVERY FinAI chat, ChatGPT Work run, Codex agent, GitHub Actions workflow, browser session, terminal task, deployment and subagent.

## Absolute boundary: Laškoteka

**NEVER change Laškoteka, in any circumstance as part of FinAI work.** This includes `laskoteka.si`, `www.laskoteka.si`, Laškoteka's repositories, shared cPanel settings, SSH keys, `authorized_keys` records, databases, cron jobs, environment files, DNS zones, storage, media, backup schedules, user accounts, code or application configuration. Do not restart shared services. Do not modify `/home/laskot48/public_html` or any Laškoteka file. Never use a FinAI task as authorization to touch Laškoteka.

The legacy shared Hiper M operating-system account `laskot48` is not a FinAI deployment destination. **There must be NO FinAI write automation, cleanup, arbitrary shell key or widened SSH access on that account.** Existing `finai:status:v1`/`finai:audit:v1` restricted SSH read-only operations are grandfathered for inspection only; do not replace or widen those keys.

## Fast-track autonomous FinAI development

Routine development of `ddcpark-coder/finai-ledger` is pre-authorized to reduce
repetitive approvals: feature branches, code changes, CI workflows, targeted
synthetic tests, PR reviews and merge to `main` after checks pass.
Do not ask for permission again for ordinary FinAI-only repository changes.
If a hosting operation is blocked, continue all independent permitted work.
The protected UI preview can use synthetic data without production deployment.
Never claim that passing GitHub CI equals a completed Hiper M deployment.
For a verified dedicated FinAI account only, routine releases may auto-stage on
successful main builds and auto-publish the **synthetic/demo** web edition when
FINAI_STAGE_ENABLED, FINAI_PRODUCTION_ENABLED and FINAI_AUTO_PUBLISH_ENABLED are
explicitly configured, the environment approval applies, a known previous
release exists, and the exact live commit smoke check passes. Roll back if that
check fails. The initial deployment is always manual after a recovery point.
Ordinary UI edits need only compilation, release integrity and the one live
smoke check; reserve comprehensive E2E/Windows suites for affected critical
code or deliberate manual dispatch.

This fast-track explicitly DOES NOT authorize shared cPanel changes, old-account cleanup, or any FinAI write on `laskot48`.
The original absolute non-interference and OS isolation boundaries remain.

## Current C: independently dedicated FinAI cPanel account

FinAI's dedicated hosting identity already exists: `einteg86`, UID 1256,
`/home/einteg86`. The current web domain roots on that account were observed as
`/home/einteg86/public_html`, `/home/einteg86/app.e-integrator.si` and
`/home/einteg86/api.e-integrator.si`. Verify live docroot and ownership at
publish time; historical paths are not a substitute for read-only preflight.

The old `laskot48` account is **legacy / read-only** for FinAI and must not be
used for writing or cleanup by any FinAI agent. No shared-account SSH keys,
`authorized_keys`, files, databases, backup policies, DNS, cron or
services may be changed. Old-account retirement is a separately authorized
administrative maintenance operation outside FinAI Work/CI, only after
dedicated hosting, backups and dependency inventory are independently verified;
see `docs/FINAI_LEGACY_CLEANUP_HANDOFF.md`.

An independent cPanel login/UID alone is not proof that deployed code and
effective OS/ACL permissions are correctly isolated. Before an actual host
write, check verified effective user, real paths, ownership, symlinks, narrow
allowed command, exact release SHA256, dedicated database scope, targeted
checks, backup and rollback. Stop only unsafe hosting changes if any fail.
Do not re-run the full hosting preflight for ordinary GitHub code work.

**Reporting preference:** Routine FinAI change summaries should focus on
functionality, CI, merge and deployed commit. Other project names need not be
repeated in every answer; the non-interference rules remain binding and must
be mentioned whenever there is an actual cross-account or hosting risk.

The current user-facing project instructions are mirrored in
`docs/FINAI_CHATGPT_PROJECT_INSTRUCTIONS.md`. Changes to the GitHub mirror
do **not** automatically update ChatGPT Project → Instructions.

## Mandatory adaptive UX and accessible complexity

Every FinAI module, subview, dialog and major work panel MUST remain usable
by people with different levels of digital and business experience.

- Offer **Osnovno, Običajno, Napredno** complexity: Osnovno uses understandable
  Slovenian labels and an uncluttered task path, Običajno shows practical
  detail, and Napredno exposes the full technical/accounting context.
- Users must be able to change panel arrangement (side-by-side, stacked,
  list-focused, detail-focused), usable widths, text size, density and
  applicable widget visibility/ordering. Preferences must be scoped to
  **user + company + module + subview** rather than one global layout.
- A user can always restore a safe default; controls must remain keyboard
  accessible and functional on small screens. Do not hide primary safety
  warnings, important totals, errors or authorizations in a "simple" mode.
- Hiding a field or switching a view is presentation only, and MUST NOT change
  server-side tenant isolation, validation, permissions, accounting calculations,
  audit records or legal obligations.
- Every visible button must either perform its stated action or clearly be
  disabled and marked `v pripravi`. Never label synthetic/mock AI results,
  OCR, invoices, bank transfers, imports or FURS operations as live.
- Deliver reusable adaptive components and minimal path-specific unit/UX tests
  instead of hard-coding custom behavior into each screen. Where a module has
  incomplete customization coverage, call it out explicitly and extend the
  shared component before claiming that all windows are fully customizable.
- Local browser storage is only a development/demo fallback. True cross-device
  personalization requires a verified, tenant-scoped authenticated preferences
  API; do not promise synchronization before that path is connected.

## FinAI isolation and architecture

- FinAI production target is **Hiper M**, on its own **separate cPanel/OS account** with isolated database, files, domain roots, users, SSH identities, logs, backups and rollback. Vercel is never production.
- The FinAI Windows desktop must be **fully standalone/offline-first**; internet, Vercel and Hiper M are not prerequisites for local startup or offline work.
- Do not modify STNG either from a FinAI task. Other projects are explicitly out of scope.
- Operate only inside the `ddcpark-coder/finai-ledger` GitHub repository and a *dedicated* FinAI OS account when verified. Every write command must validate the user, exact target path and expected prior state and reject symlinks/path traversal.
- Development/tests and packaging may run from GitHub without hosting access. Stage deployments through a SHA256-verified, command-allowlisted SSH gate and only inside the isolated FinAI account.
- Real production promotion requires prior CI PASS, separate environment approval, health checks and a documented rollback. Never auto-promote an untested build just because an assistant says "izvedi".
- No direct production access to sensitive accounting, FURS, banking, payroll or customer data until backup/restore, security, tenant isolation, audits and legal compliance pass.
- Secrets and SSH private keys belong in GitHub encrypted secrets or a provider secret store, never source code, chat, tickets or log output. Do not print keys or ask users to paste private keys here.
- If proper account isolation is not available, STOP at code/tests/read-only checks; no production writing or bypassing provider restrictions.

## Applying these rules in ChatGPT

This repository file binds coding agents that load it. GitHub cannot change ChatGPT Project settings: copy the current version C from `docs/FINAI_CHATGPT_PROJECT_INSTRUCTIONS.md` into **ChatGPT Project → Instructions**. The ordinary Work opening line can be concise, but the dedicated-account boundary and absolute prohibition on altering any other project or legacy hosting remain binding. A generic "continue" or "execute" never authorizes old-account cleanup.
