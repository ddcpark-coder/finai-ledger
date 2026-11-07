# FinAI – namenski SSH audit na Hiper M (operativni postopek)

**Status 2026-11-07:** FinAI key installed; real SSH connection and independently verified host identity still not demonstrated. The gate `finai:status:v1` passed direct local invocation, and an arbitrary command was denied. The `shared/.env` and `current` symlink are still absent. **Do not report full access as connected.**

## Observed host data

- Account: `laskot48`.
- Server reported hostname: `hcp-30.controlpanel.si`.
- Actual SSH service port: **unverified** (22 is an initial candidate based on other repository workflows).
- Host's `/etc/ssh/ssh_host_ed25519_key.pub` was inaccessible to the shared cPanel user. Do not confuse the fingerprint of the **client** key with the fingerprint of the **server** key.
- Dedicated client Ed25519 key fingerprint (not a credential): `SHA256:NkSXlIOxybr1c3pbDWUeWjugtA0livvN8fPzaB4W1vI`.
- Dedicated FinAI public key was installed by `ops/finai-install-audit-key.sh --apply`, which reported `FINAI_SSH_KEY_INSTALLED=YES`, and stated that existing entries were preserved; private key remains with user.

## First real SSH test (on Windows, no secret copied to chat)

Only use a previously **trusted** Windows OpenSSH known_hosts record or obtain the official server-host fingerprint independently from Hiper M support. Never resolve an unknown/changed key with `StrictHostKeyChecking=no`, `accept-new`, or unverified `ssh-keyscan`.

In Windows PowerShell, inspect the known host record:

```powershell
$server = "hcp-30.controlpanel.si"
$knownHosts = Join-Path $HOME ".ssh\known_hosts"
if (-not (Test-Path $knownHosts)) {
  Write-Host "STOP: no previously trusted known_hosts record"
} else {
  ssh-keygen -F $server -f $knownHosts
}
```

If there is a trusted record for the *actual SSH port* and it was verified previously, perform a read-only forced-command test. For port 22:

```powershell
$server = "hcp-30.controlpanel.si"
$key = Join-Path $HOME ".ssh\finai_github_audit"
$knownHosts = Join-Path $HOME ".ssh\known_hosts"
ssh -T -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$knownHosts" -o ConnectTimeout=12 -i $key -p 22 "laskot48@$server" "finai:status:v1"
```

**Expected only on actual success:** `finai_gateway=v1` and `operation=status`, `laravel=present`. If unknown host, host key changed, missing key, failed login or network timeout, stop and diagnose. Do not weaken verification. Also test that a forbidden command is denied on the real SSH connection before the CI bridge is approved.

## GitHub Actions environment

- After review and merging this **ops-only** PR into `main`, the Actions workflow `FinAI guarded remote audit (no writes)` can be manually dispatched.
- Create a separate GitHub environment `finai-remote-audit`; restrict it to `main`. Add required reviewers when supported.
- Environment variables: `FINAI_SSH_HOST` (verified endpoint), `FINAI_SSH_USER=laskot48`, `FINAI_SSH_PORT` (verified port).
- Environment secret `FINAI_AUDIT_SSH_PRIVATE_KEY`: the dedicated Windows private key only, pasted **directly into GitHub Settings** by its owner. Never copy private key into chat, repository, Vercel, CI logs or unrelated Laškoteka secrets.
- Environment secret `FINAI_AUDIT_SSH_KNOWN_HOSTS`: verified full OpenSSH known_hosts line(s) matching the actual SSH endpoint. Unknown or unverified host key is a blocker.
- Run `workflow_dispatch`, choosing `status`. A passing `validate-gateway` with a **skipped** `remote-read-only` does not mean the connection works; the latter must pass.
- Never grant a general shell or unrestricted `authorized_keys` entry to the FinAI CI key, nor change existing Laškoteka keys.

## Emergency revoke and scope

On Hiper M revoke **only** the new `finai-github-audit` key, preserving all existing authorized keys. Revoke `FINAI_AUDIT_SSH_PRIVATE_KEY` from the dedicated GitHub environment. Do not restore the whole account. The SSH gate is a read-only entry filter, not process/filesystem separation: account `laskot48` still owns unrelated projects. Automated writes and production operations must wait for an isolated FinAI hosting account, backup + restore verification, and explicit authorization gates.
