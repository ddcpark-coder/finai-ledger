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

## 8. 11. 2026 – instalacija in resnični rezultati

- Uporabnik je izvedel pregled in `--apply` iz točno določenega SHA `33b93a7b84c2e025dd23ffc787fea9a7cc21b4ab`, `FINAI_CPANEL_GATE_UPGRADE=PASS`, `new_gate_blob=6b565e35673c234f16ff4590c16807340d7b5c57`. `authorized_keys` ni bil spremenjen; stara različica je arhivirana v FinAI shared/ops.
- GitHub Actions `42499096779` je dejansko zagnal `finai:domains:v1` in vrnil `domain=... document_root=unavailable` za glavne in obe poddomeni ter `dns_zone_status=unavailable`, `result=partial_read_only_audit`, exit 69. To **ni dokaz odsotnosti DNS zapisov** in ne šteje kot uspešen pregled cPanel cone.
- GitHub Actions `42499264894` je ponovno potrdil `validate-gateway=PASS`, `remote-read-only=PASS` za stari ukaz `status`; zaščita SSH ostaja aktivna. Privzeti `push` se je vrnil na `status` (namesto nedelujočega `domains`), razširitev `domains` pa ostaja pripravljena na odpravo.
- Da bi ugotovili razlog brez izpisovanja skrivnosti, je pripravljen `ops/finai-uapi-probe.py` (koda s preverjanim Git SHA), ki **samo bere** fiksne tri vnose DomainInfo in `DNS parse_zone`, primerja delovanje API CLI v običajnem in omejenem okolju ter izpiše samo vrste/izhodne kode, documentroot znotraj uporabnikove domače mape in število filtriranih DNS zapisov. Ne izpisuje surovih odgovorov cPanel API, e-poštnih naslovov ali TXT.
- Nova namestitev ali poseg v cPanel DNS ni dovoljen brez ugotovljenega vzroka. Ostaneta javna HTTP 200 glavne strani in varovani Vercel `app` brez aktivnega DNS.

## UAPI diagnostika EXIT=2 — 8. 11. 2026

Uporabnik je izvedel `ops/finai-uapi-probe.py` neposredno v cPanel Terminalu. `binary_present=yes` in `binary_executable=yes`, toda pri vseh štirih dejanskih API klicih v obeh okoljih (`inherited` in `minimal`) je bil rezultat `nonzero_exit_2`. To pomeni, da CLI ne vrača podatkov za nobeno funkcijo, **ne** da DNS zapisi ali domena ne obstajajo.

Uradna cPanel dokumentacija potrjuje, da je CLI oblika `uapi --user=username --output=json Module function parameter=value` običajno veljavna. Zato konkretnega vzroka iz izhodne kode 2 ni mogoče zanesljivo določiti brez preverjanja kategorije sporočila o napaki. Pri nepodprtem lokalnem API lahko vplivajo pravice uporabnika, izvedba `--user` v tem okolju, omejitve ponudnika, ali napaka samega UAPI pred zagonom funkcije. **Ne uvajaj API tokenov, ne obidi prijave in ne odstranjuj SSH omejitev.**

Pripravljen je `ops/finai-uapi-exit2-probe.py` za točno določeno dodatno, samo bralno diagnostiko. Preskusi `DomainInfo list_domains`, `DomainInfo single_domain_data` ter `DNS parse_zone` z/ brez `--user=laskot48` in z obema veljavnima oblikama JSON. Izpisuje le izhodno kodo, kategorijo napake in oznako, ali je strukturiran API odgovor uspel; v dnevniku **ni** surovega stdout/stderr, DNS cone, gesel ali email podatkov. Ne spreminja cPanel, DNS, SSH, Vercel ali Laškoteke.

Po rezultatu preveri, katera od preizkušenih oblik deluje, nato v ločenem PR pripravi popravek fiksnega `finai-domain-readonly.py` in atomični upgrade obstoječega SSH forced-command varovala. Če nobena oblika ne deluje, za razlago izhodne kode 2 uporabi podporo Hiper M in ne vzpostavljaj alternativnega privilegiranega kanala brez odobritve.
