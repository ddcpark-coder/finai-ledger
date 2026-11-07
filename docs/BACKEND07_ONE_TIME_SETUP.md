# BACKEND-07 – enkratna priključitev varovanega SSH dostopa FinAI

Status 2026-11-07: **NI AKTIVIRANO**. Laškoteka, cPanel, authorized_keys in FinAI DB niso spremenjeni. GitHub CI izvaja lokalne varnostne teste; remote-read-only korak je preskočen.

## Predpogoji

- Uporabnik je potrdil, da na Hiper M že deluje SSH za Laškoteko, vendar ta projekt **ne sme** uporabljati obstoječih ključev `digitalna-dediscina` ali `laskoteka_prod_github`.
- Za FinAI nastane **nov** Ed25519 ključ in ločeno zaščiten GitHub environment `finai-remote-audit`; navadni cPanel master ključ ali geslo nista primerna.
- `~/.ssh/authorized_keys` obstaja kot običajna datoteka (ni simbolna povezava), pravice map 0700 in datoteke 0600; če predpogoj manjka, naj postopek ustavi brez spreminjanja Laškotekinih ključev.
- Za uporabo Hiper M je treba potrditi, da OpenSSH strežnik podpira `restrict,command="..."` ter da cPanel ne prepisuje te konfiguracije. Ne uporabljati cPanel Authorize postopka, če bi odprl neomejeni dostop.
- Prve spremembe: namestitev prehoda v **zasebno** FinAI mapo in *dodajanje ene* omejene javne vrstice v authorized_keys, s ciljno varnostno kopijo. To je še vedno skupni račun in ne OS izolacija.

## 1. Pridobitev pregledane kode na Hiper M

Na enem obstoječem cPanel Terminalu. Koda poseže samo v zasebne FinAI poti in lokalne Git objekte, brez selitve main, brez .env in brez baz.

```bash
set -euo pipefail
ROOT=/home/laskot48/apps/finai-ledger
RELEASE="$ROOT/releases/20013672a44a5c7dd426adb71e3dff07cbb4852b"
REVIEWED_SHA=caad4934481d6c373cdc2c7ce7e859c5309a506c
STAGE="$ROOT/shared/automation-source/$REVIEWED_SHA"
umask 077
test "$(id -un)" = laskot48
test -d "$RELEASE/.git"
git -C "$RELEASE" fetch --no-tags origin backend-07-guarded-automation
git -C "$RELEASE" cat-file -e "$REVIEWED_SHA^{commit}"
test ! -e "$STAGE"
install -d -m 700 "$STAGE"
git -C "$RELEASE" archive "$REVIEWED_SHA" ops | tar -x -C "$STAGE"
bash "$STAGE/ops/finai-install-audit-key.sh" --inspect
```

**Stop** if `--inspect` is not PASS. Do not use `--apply` in this first step. This script reads only file existence/permissions, *not* other keys. If a folder exists already, stop rather than overwrite it.

## 2. Dedicated keypair (private key never in chat)

Generate **on user's trusted Windows machine** using Windows OpenSSH in PowerShell:

```powershell
ssh-keygen -t ed25519 -f "$HOME\.ssh\finai_github_audit" -C "finai-github-audit"
```

For unattended CI, this dedicated audit key needs an empty passphrase (press Enter twice). The private key is a sensitive credential: save its content only as an **environment-level** GitHub Actions secret `FINAI_AUDIT_SSH_PRIVATE_KEY`, not in repository, chat, issues, workflow logs, or Vercel.

Copy **only** the public key for step 3:

```powershell
Get-Content "$HOME\.ssh\finai_github_audit.pub" | Set-Clipboard
```

## 3. Install limited authorization (explicit opt-in)

After verifying the reviewed gate and having a targeted authorization backup plan, in the **same cPanel** terminal run:

```bash
bash "$STAGE/ops/finai-install-audit-key.sh" --apply
```

Paste the *public* `ssh-ed25519` key at the prompt. Installer:
1. Verifies current OS user, FinAI filesystem, existing .ssh permissions, and source gate syntax.
2. Rejects duplicate public keys, symlinks, or mismatched installed gate.
3. Copies a stable gate to `/home/laskot48/apps/finai-ledger/shared/ops`.
4. Makes a targeted backup of `~/.ssh/authorized_keys`, then atomically appends a single forced-command-only line preserving the old lines.
5. Allows exactly `finai:audit:v1` and `finai:status:v1` commands through the new key. No direct shell, uploads, PHP/SQL, deploy, or migrations.

**Never use cPanel's Authorize on this FinAI key** if doing so also appends an unrestricted public key line; it would invalidate the restriction.

## 4. Protected GitHub environment

Settings → Environments → `finai-remote-audit`. Restrict deployment branches to `main`, set reviewers if supported by repository plan, and store only:
- Variables: `FINAI_SSH_HOST` (verified actual Hiper M SSH hostname), `FINAI_SSH_USER=laskot48`, `FINAI_SSH_PORT` (verified actual port).
- Secrets: `FINAI_AUDIT_SSH_PRIVATE_KEY` (dedicated private key), `FINAI_AUDIT_SSH_KNOWN_HOSTS` (actual host public key line with fingerprint **independently verified** with Hiper M, never blindly trusted via ssh-keyscan).

**No environment without branch protection/review restrictions.** Do not copy Laškoteka secrets: different repository, different key, different purpose.

## 5. Enable audit only after full code review

Draft PR #35 (BACKEND-06) remains unmerged; PR #36 builds on top of it. The SSH workflow `workflow_dispatch` is only operable after its file exists on the default branch `main`; merging the parent chain would affect more than SSH access and may trigger Vercel deployment. **Do not merge either PR merely to enable this workflow**. Obtain a separate deployment/merge review, or land a standalone reviewed operations-only workflow onto `main` with Vercel gating.

Once enabled, manually run `FinAI guarded remote audit (no writes)` with `status`. Check that `remote-read-only` job executes and passes, not just `validate-gateway`. Run a second intentionally invalid SSH command using the dedicated key and confirm it is denied. No real data, migration or public login.

## 6. Revocation

Remove **only** the `finai-github-audit` entry from authorized_keys (preserve all unrelated entries), remove/revoke the dedicated GitHub environment private-key secret, and disable the FinAI audit workflow. Do not restore all of cPanel; use the targeted backup only if needed and after verifying no legitimate concurrent SSH key changes.

**Boundary:** Forced-command SSH does not prevent code running as `laskot48` from affecting other files if the whole OS account is compromised. Full unattended write/deploy privileges are reserved for a separate isolated FinAI hosting account.
