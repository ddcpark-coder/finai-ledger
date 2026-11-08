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

## Local one-time setup without pasting secrets

Windows PowerShell script `ops/finai-configure-github-access.ps1` is syntax-checked in CI and uses the user's already verified dedicated local SSH key. It checks the actual allow/deny behavior over SSH and confirms GitHub CLI account permissions. Without `-Apply`, it is read-only. With explicit `-Apply`, it:
1. Creates environment `finai-remote-audit` only if absent, allowing **exactly** branch `main`; stops if an existing environment has broader branch rules.
2. Saves host/user/port as environment variables.
3. Sends the dedicated private key and Windows trusted known_hosts lines **directly through authenticated GitHub CLI standard input** into GitHub's encrypted environment secrets.
4. Does not merge PRs, deploy application code or change the Hiper M server.

Requires GitHub CLI `gh.exe` authenticated locally with administrative permission to `ddcpark-coder/finai-ledger`. The script will fail closed if CLI login, host-key verification, SSH denial, or environment protections are missing. The original Windows user should review and run it locally; never share or upload the private key in chat.

PR #37 remains **DRAFT** until the GitHub environment and existing production/Vercel deployment implications are checked. `workflow_dispatch` will work only after the workflow is reviewed and merged into the repository default branch.

## Planned unattended checks (inactive while PR is draft)

The reviewed GitHub Actions workflow now includes a **read-only weekday status check at 04:17 UTC** (05:17 in Slovenia during winter time, 06:17 during daylight saving time). It is not active until the workflow is merged into `main` and the `finai-remote-audit` environment has passed configuration. The scheduled job performs only `finai:status:v1`; manual dispatch can additionally request `finai:audit:v1`.

Do not interpret this as permission for background data processing, file changes, application deployment, migrations or unrestricted SSH access.

## Potrjeno 8. 11. 2026 in varovalo za Vercel

- Uporabnik je na Windows s stricim `StrictHostKeyChecking=yes` in ločenim `finai_github_audit` ključem dejansko izvedel `finai:status:v1` na `hcp-30.controlpanel.si:22`. Server je vrnil `finai_gateway=v1`, `operation=status`, `laravel=present`, `dependencies=present`, `shared_env=missing` in `current_symlink=missing`. To dokazuje ujemanje strežniškega ključa z Windows known_hosts, ne neodvisne potrditve lastništva strežniškega ključa pri ponudniku.
- Lokalni `ops/finai-configure-github-access.ps1 -Apply` je uspešno preveril tudi zavrnitev poljubnega SSH ukaza; ustvaril GitHub environment `finai-remote-audit`, strogo politiko `main`, spremenljivke gostitelja ter oba šifrirana SSH environment secret-a. Vsebini skrivnosti nista v repozitoriju.
- `vercel.json` v tem PR-ju namerno izklopi Git-triggered deployment za `main` in samo infrastrukturo vejo. Cilj: preprečiti samodejno produkcijsko objavo Next.js ob združitvi tega SSH-only PR. Pred prihodnjo namerno objavo uporabniškega vmesnika FinAI je treba varovalo izrecno pregledati in odstraniti ali zamenjati z namensko politiko objav. To ne vpliva na Laškoteko.
- Oddaljeni korak GitHub Actions še ni dokazano uspešen; do njegovega dejanskega PASS se avtomatiziran dostop šteje kot pripravljen, ne aktiviran.


## Aktivacija 8. 11. 2026 — potrjeno

- PR #37 je združen v `main` (squash SHA `4031079eabc9aa56c70e48f1f69255b02e596f94`).
- GitHub Actions **push** zagon `42485375485` je dejansko izvedel `validate-gateway=success` in `remote-read-only=success`; iz logov: `finai_gateway=v1`, `operation=status`, `laravel=present`, `dependencies=present`, `shared_env=missing`, `current_symlink=missing`.
- Nadaljnji avtomatiziran zagon `42485536442` na SHA `7acec61c6e81887d84eb59b72d593fb872fa606f` je **PASS**, vključno s preverjanjem točne vsebine odziva ter zavrnitve `id` z izhodno kodo 64. Iz loga: `FINAI_SSH_DENIAL_CHECK=PASS`, `FINAI_REMOTE_READONLY=PASS`.
- Omogočeni dogodki: ob spremembah relevantnega varnostnega workflowa na `main`, ročni `workflow_dispatch` in bralni pregled po urniku ob delavnikih 04:17 UTC. Urnik ni preizkušen do prvega prihodnjega termina; potrjena sta *push* zagona.
- Vercel Git auto-deploy za `main` je izključen z `vercel.json`; pred naslednjo načrtno objavo frontend aplikacije ga je treba ločeno pregledati.
- To ni dovoljenje za deploy, DB migracije, javno prijavo, branje zasebnih podatkov ali pisanje na skupnem gostovanju.
