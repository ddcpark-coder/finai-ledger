# FinAI guarded automation access v1 — NOT active

**State:** source-control preparation only. No host connection, SSH key, GitHub environment, authorized_keys edit, database user, migration, website deployment, cPanel change, or DNS change has been performed by this change.

## Scope and limitations

- Scope is **FinAI-only, read-only audits** through a dedicated GitHub Actions SSH key with a server-side OpenSSH forced command; remote command arguments are from a fixed allowlist (finai:audit:v1 and finai:status:v1). No arbitrary shell, SQL, PHP, file writes, migration, backup restore, or rollout is supported.
- Shared Hiper M account laskot48 owns both FinAI and Laškoteka: **a forced-command gate is NOT equivalent to a separate UID, chroot, VM, or hosting account**. If the cPanel user/account is compromised, it can edit the gate, SSH config and other projects. Full FinAI-only autonomy with strong isolation requires a separate hosting account and security review.
- Never install a self-hosted Actions runner on laskot48. Never place cPanel master credentials, production DB credentials or app keys in GitHub. Never authorize an unrestricted SSH key for a GitHub workflow.
- FINAI_AUTH_RELEASE_ENABLED=false remains unchanged and no public access is activated.

## Deployment model and integrity

1. Review and merge the workflow and gate source to GitHub main **only after review**. workflow_dispatch remote audit runs only from main. On PRs the CI only runs static denial tests and touches no server.
2. Before activation, confirm SSH is authorized for this cPanel user and that the host supports the restrict,command= syntax in authorized_keys, and verify an independently trusted SSH host-key fingerprint with Hiper M. Do **not** take a fingerprint from ssh-keyscan and blindly trust it. Use GitHub's environment finai-remote-audit with deployment branches restricted to main.
3. On a trusted local computer generate a **new** Ed25519 keypair used only for the audit job. Do not paste the private key into chat, a repository file, cPanel public HTML or logs. Keep the private key only in the GitHub environment secret FINAI_AUDIT_SSH_PRIVATE_KEY. Put the verified known_hosts host-key line only in environment secret FINAI_AUDIT_SSH_KNOWN_HOSTS. GitHub environment variables: FINAI_SSH_HOST, FINAI_SSH_USER=laskot48, FINAI_SSH_PORT.
4. On the Hiper M host, copy the **reviewed gate script** to /home/laskot48/apps/finai-ledger/shared/ops/finai-ssh-gate.sh, not into a public web root. Set umask 077, ensure /home/laskot48/apps/finai-ledger/shared/ops is private, and set script mode 0700. The host's installed copy must be reviewed before any modification and never replaced automatically from a Git checkout.
5. Add only the **public** part of that dedicated key to /home/laskot48/.ssh/authorized_keys, as a single OpenSSH option-prefixed line (one line, no line breaks):

   ```text
   restrict,command="/home/laskot48/apps/finai-ledger/shared/ops/finai-ssh-gate.sh" ssh-ed25519 AAAA... finai-github-audit
   ```

   Replace AAAA... with your own actual public key bytes. Keep all existing authorized keys untouched. **Do not** use the cPanel "Authorize" action if it appends an unrestricted key line; inspect and verify the effective authorized_keys line after installation. Obtain hosting provider confirmation before modifying SSH authorization. Make a targeted backup of authorized_keys first, stored outside public HTML, and test existing login before closing the current session.
6. With the host key and account verified, manually trigger GitHub Actions FinAI guarded remote audit (no writes) and choose status. Check only sanitized output. Verify the wrong command is denied with exit 64, and confirm Laškoteka still works. A successful audit does not prove OS isolation.

## Revocation and recovery

- Revoke by deleting the **one dedicated public key** from the host's authorized_keys; never remove unrelated keys. Remove FINAI_AUDIT_SSH_PRIVATE_KEY from GitHub environment; preserve its audit history. If any trust boundary changes, revoke before rotating/reprovisioning.
- On login or security errors, stop; never bypass a security challenge or set StrictHostKeyChecking=no.
- Emergency stop: disable the GitHub environment/Actions workflow and remove its dedicated authorized key. No automatic restoration of the entire shared hosting account.

## Next phases (not granted by this workflow)

A second, isolated FinAI account permits stronger automation: signed artifacts, per-release backups, narrow DB runtime grants, migration plan checks, staged deployment to current/public, route health checks, rollback with verified compatibility, and protected approvals for destructive changes. Those must be separately reviewed and tested. This first phase intentionally does not grant broad write access.
