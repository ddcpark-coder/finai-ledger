# FinAI / Ledger — mandatory repository agent instructions

These rules apply to EVERY FinAI chat, ChatGPT Work run, Codex agent, GitHub Actions workflow, browser session, terminal task, deployment and subagent.

## Absolute boundary: Laškoteka

**NEVER change Laškoteka, in any circumstance as part of FinAI work.** This includes `laskoteka.si`, `www.laskoteka.si`, Laškoteka's repositories, shared cPanel settings, SSH keys, `authorized_keys` records, databases, cron jobs, environment files, DNS zones, storage, media, backup schedules, user accounts, code or application configuration. Do not restart shared services. Do not modify `/home/laskot48/public_html` or any Laškoteka file. Never use a FinAI task as authorization to touch Laškoteka.

The shared Hiper M operating-system account `laskot48` also hosts Laškoteka and STNG. **There must be NO FinAI production write automation, arbitrary shell key or widened SSH access on that account.** Existing `finai:status:v1`/`finai:audit:v1` restricted SSH read-only operations are grandfathered for inspection only; do not replace or widen those keys.

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

This fast-track explicitly DOES NOT authorize any new keys, shared cPanel
changes, or FinAI write operations on the shared `laskot48` account.
The original absolute Laškoteka/STNG and OS isolation boundaries below remain.

## Temporary B: common physical hosting, no shared-account write authority

**Approved temporary development policy, NOT an SSH authorization:** FinAI may
be developed and visually tested while other sites operate on the same physical
Hiper M server and under the same hosting subscription. This does not make
the shared `laskot48` OS/cPanel identity safe for FinAI write automation.

- The shared `laskot48` account remains **FinAI read-only**. Do not install,
  replace or widen any SSH keys or `authorized_keys` there.
- Different domain names, SQL database users, document roots, `chmod 700`,
  and forced-command scripts do **not** form an independent Unix permission
  boundary for processes that all run with the same UID.
- Before any FinAI host writes, require a provider-verified separate effective
  OS account and independent permissions, even when hosted on the same
  physical Hiper M server. Otherwise perform development, compilation,
  isolated synthetic tests and GitHub PRs only.
- Production-grade migration and handling of real data remain separately
  gated. Never touch Laškoteka or STNG in any case.

The approved Project instructions are mirrored in
`docs/FINAI_CHATGPT_PROJECT_INSTRUCTIONS.md`. The user confirmed they updated
ChatGPT Project settings; this repository file does not authorize shared-host
writes or deploys.

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

This repository file is authoritative for automated coding agents that load the repository. Because a GitHub file cannot directly alter a ChatGPT Project's own settings, also place the absolute Laškoteka prohibition in **ChatGPT Project → Instructions**. Any future FinAI Work prompt must carry the same prohibition. No exception is authorized by a generic instruction to "continue" or "execute".
