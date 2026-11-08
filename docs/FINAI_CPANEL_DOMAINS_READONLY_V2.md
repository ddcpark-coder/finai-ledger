# OPS-FINAI / SITE-EI-02 — read-only cPanel DNS + document roots

**Purpose:** replace unreliable TinyFish cPanel cookie-session reuse with the already verified GitHub Actions → Hiper M dedicated SSH forced-command gate for **read-only** FinAI diagnostics.

## Design

- Existing key remains dedicated `finai-github-audit`, in `/home/laskot48/.ssh/authorized_keys`, restricted to fixed command `/home/laskot48/apps/finai-ledger/shared/ops/finai-ssh-gate.sh`. **Do not alter any authorized_keys entries.**
- Extend the installed gate with one literal-only command: `finai:domains:v1`. Retain `finai:status:v1` and `finai:audit:v1`; all unknown commands (including additional arguments and shell metacharacters) denied with exit **64**.
- The only new execution path is `/usr/bin/python3 -I -S /home/laskot48/apps/finai-ledger/shared/ops/finai-domain-readonly.py`, invoked by the fixed gate (not directly from a client-supplied path).
- Reader invokes only exact read-only cPanel UAPI operations: `DomainInfo single_domain_data domain=e-integrator.si`, likewise for `app.e-integrator.si` and `api.e-integrator.si`; plus `DNS parse_zone zone=e-integrator.si`. Source: [official cPanel UAPI CLI](https://api.docs.cpanel.net/cpanel/introduction) and [DomainInfo](https://api.docs.cpanel.net/specifications/cpanel.openapi/domain-information/domaininfo-single_domain_data).
- The raw DNS zone **is never printed to GitHub logs**. It emits only A/AAAA/CNAME records for the four exact FinAI hostnames (including `www`); **no TXT, MX, NS, SOA, email records, credentials, .env or cPanel secrets**. It emits document roots only when contained in `/home/laskot48/`.
- On unsupported/missing API or unexpected response schema it reports `unavailable`/`unknown_schema`, exits nonzero, and **does not** infer that records do not exist.
- The current cPanel OS account is shared with Laškoteka. This command does **not** provide filesystem isolation, system write privileges or general terminal access. It cannot modify DNS.

## Deployment

1. GitHub PR tests must pass; merge this **ops-only** change to `main`. It does not deploy to Hiper M because the SSH key is deliberately limited.
2. Stage exact-reviewed Git SHA `ops/finai-ssh-gate.sh`, `ops/finai-domain-readonly.py`, and `ops/finai-upgrade-cpanel-gate.sh` **inside FinAI shared directory** from the repo's Git history. Do not stage under public_html.
3. On the Hiper M cPanel Terminal run `bash STAGE/ops/finai-upgrade-cpanel-gate.sh --inspect`. This must be PASS before explicit `--apply`. The installer checks known v1/v2 gate content via Git blob SHA, cPanel user, exact restricted SSH key, Python3, UAPI, and source hashes. It does not edit SSH keys, app files, DB, DNS or Laškoteka. It atomically replaces only the existing FinAI gate and installs the fixed reader; old gate backup is stored inside FinAI shared/ops and rollback restores old gate if post-install tests fail.
4. After the user confirms `FINAI_CPANEL_GATE_UPGRADE=PASS`, run GitHub Actions `FinAI guarded remote audit` with `operation=domains` and verify it returns `result=read_only_domain_audit_complete`. This can be triggered via a code change to workflow `main` that requests `domains` for an immediate read-only smoke run; *never* treat skipped remote job as PASS.

## Open items

The public domain `e-integrator.si` and `www.e-integrator.si` are already HTTPS 200 with the landing page. Vercel `app.e-integrator.si` was added and SSO set to `all`, but external DNS is missing; `api.e-integrator.si` has no verified working DNS. **Do not** publish an unconfigured Laravel API or expose the incomplete Next.js UI until DNS, access controls and isolated hosting checks are reviewed.

This procedure is intentionally staged and fail-closed, not an unrestricted cPanel maintenance channel.
