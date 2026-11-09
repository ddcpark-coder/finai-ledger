# FinAI – ločena avtomatizacija Hiper M (analogno STNG, brez vpliva na Laškoteko)

## Nespremenljiva meja

**Prepovedane so VSE spremembe Laškoteke** – tudi posredne, v vseh FinAI klepetih, Work/Codex nalogah, SSH sejah, GitHub Actions in ročnih postopkih. Prepoved velja za kodo, DNS, SSL, SSH ključe, `authorized_keys`, cPanel skupne nastavitve, PHP, MariaDB, cron, varnostne kopije, podatke in javne datoteke Laškoteke. Prepovedan je tudi poseg v STNG zaradi naloge FinAI.

Dokler račun `laskot48` gosti Laškoteko, **ne sme dobiti novega FinAI ključa s pisalnimi pooblastili**, splošnega SSH ukaza ali pisalnega samodejnega deploya. Obstoječa varovana FinAI SSH povezava na tem računu ostane samo za read-only preglede.

## Potrjena časovnica računa Hiper M (9. 11. 2026)

Uporabnik je izrecno potrdil, da **ves čas razvoja in testiranja ostane na voljo samo skupni račun `laskot48`**. Ločen Hiper M račun za FinAI se vzpostavi **pred javno produkcijo**, ne kot predpogoj za nadaljnji razvoj. Ne zahtevaj njegovega odpiranja pri vsaki naslednji razvojni nalogi.

**Dovoljena razvojna pot do takrat:** ločene GitHub veje, avtomatski testi na GitHub-hosted runnerjih z lastno začasno testno podatkovno bazo, pregled in združevanje, statični build artefakti, interno preizkušanje Windows offline namestitve, lokalni Laravel razvoj in sintetični podatki. Na skupnem računu FinAI izvaja samo dovoljeni read-only status/preflight, brez nameščanja novih ključev, DNS sprememb ali FinAI staging/produkcyjskih zapisov.

**Blokirano samo do predprodukcijske ločitve:** oddaljeni SSH stage/deploy, Laravel migracije na Hiper M, aktiviranje javnih `app`/`api` poddomen ter produkcijski preklop. Razvoj in CI se ne ustavita. Ločen račun se varnostno preveri in namenska SSH povezava enkratno vzpostavi v prehodu v javno produkcijo.

## Ločitev FinAI – načrt in implementacija

| Sloj | Namen | Meja |
|---|---|---|
| GitHub `ddcpark-coder/finai-ledger` | razvoj, PR, CI, gradnja spletnega `out/`, Windows exe | samo projekt FinAI |
| GitHub Secrets `FINAI_DEPLOY_*` | ločen **nov** ED25519 deploy ključ in potrjeni `known_hosts` | nikoli ne uporabi STNG/Laškoteka ključev |
| Hiper M **nov ločen cPanel/OS račun FinAI** | statična aplikacija, Laravel/PHP, MariaDB, dokumenti, kopije | nikoli pod `laskot48` |
| `$HOME/finai-deploy/releases/<sha256>` | preizkušene, nespremenljive statične izdaje | samo namenske FinAI datoteke |
| `$HOME/finai-deploy/current` | zamenjava aktivne statične izdaje | omogočena šele po neodvisni kontroli docroot in produkcijski odobritvi |
| GitHub environments | `finai-staging`, `finai-production` | staging ob ustreznem CI, produkcija po eksplicitni odobritvi |
| Windows namizna različica | offline-first, lokalno šifrirana baza, ločen namestitveni paket | ne odvisna od Hiper M za zagon |

Načelo je enako uporabljenemu pri STNG (izdaje / current / obnovitev / GitHub Actions → SSH), vendar **FinAI ne uporablja nobenega STNG ključa, delovne mape ali konfiguracije**. Ničesar ne preklapljaj na Laškotekinem računu.

## Status te priprave – kaj je in kaj ni narejeno

**Pripravljeno v GitHub izvorni kodi:**
1. `AGENTS.md` – stalno projektno pravilo za sodelujoče agente.
2. `ops/finai-isolated-ssh-gate.py` – prisilni SSH ukazi izključno `finai:status:v1`, `finai:stage:v1:<sha256>`, `finai:promote:v1:<sha256>`; zavrne poljubni ukaz, datotečne poti in konfiguracijske datoteke.
3. `ops/finai-isolated-install-key.sh` – enkratna namestitev SAMO na novem, ločenem cPanel računu, z varnostno kopijo tamkajšnjega `authorized_keys`; na `laskot48` se izrecno ustavi.
4. `ops/finai-ci-isolated-ssh.sh` – uporablja ključ GitHub Secrets, strogi `known_hosts`, preveri SHA256 in prisilno zavrnitev splošnih ukazov.
5. `.github/workflows/finai-isolated-deploy.yml` – CI testiranje, statični build, po vklopu nadzorovano nalaganje na staging; produkcija samo prek `workflow_dispatch` in `finai-production` okolja.
6. `tests/test_finai_isolated_ssh_gate.py` – poskus prehoda med mapami, podtaknjene povezave, poškodovan checksum, zavrnitev neznanih ukazov in varovan preklop.

**Ni izvedeno in mora ostati izključeno do priprave infrastrukture:**
- Nov ločen račun Hiper M za FinAI ni potrjen; njegovega imena, SSH hosta in document root **ne smemo ugibati**.
- Ključ ni ustvarjen ali vstavljen v noben račun; noben obstoječi Laškoteka/STNG/FinAI SSH ključ ni spremenjen.
- GitHub Secrets, GitHub environment odobritve ter vars `FINAI_STAGE_ENABLED`/`FINAI_PRODUCTION_ENABLED` **niso nastavljeni**; začetna vrednost je izključeno.
- DNS `app.e-integrator.si` in `api.e-integrator.si` še ni usmerjen na Hiper M in se ne sme usmeriti na Vercel.
- Laravel `api`, podatkovna baza, migracije, strežniška varnostna kopija/restore in produkcijski rollback so **ločene naloge**, niso pokriti s statičnim deploy gatewayjem.

## Enkratni predpogoji

**1. Izoliran račun Hiper M — šele pred javno produkcijo.** Do takrat ostane skupni račun `laskot48` nespremenjen in read-only za FinAI. Pred javno produkcijo uporabnik pri Hiper M pridobi neodvisen cPanel/OS račun za FinAI. Pred vklopom je treba z read-only preflightom potrditi, da se ne deli z Laškoteko ali STNG, in da sta e-integrator.si / app / api pravilno vezana. Dokler tega ni, sta dovoljena samo razvoj in GitHub CI.

**2. Nov SSH ključ.** Ustvari lasten FinAI Ed25519 par. Zasebni ključ shrani samo v GitHub environment secret `FINAI_DEPLOY_SSH_PRIVATE_KEY`, javni ključ namesti samo v ločenem računu z `ops/finai-isolated-install-key.sh`. Ne uporabljaj obstoječih ključev iz drugih projektov. Navodilo ne od uporabnika ne od agenta nikoli ne zahteva objave zasebnega ključa v klepetu.

**3. V GitHub konfiguriraj:** environments `finai-staging` in `finai-production`, secrets `FINAI_DEPLOY_SSH_PRIVATE_KEY` ter `FINAI_DEPLOY_SSH_KNOWN_HOSTS`, vars `FINAI_DEPLOY_SSH_HOST`, `FINAI_DEPLOY_SSH_USER`, `FINAI_DEPLOY_SSH_PORT`. Var `FINAI_STAGE_ENABLED=true` se vključi samo po uspelih varnostnih testih izolirane povezave; `FINAI_PRODUCTION_ENABLED=true` šele po docroot, HTTPS, rezervnih kopijah in verifikaciji povrnitve. Production environment mora zahtevati odobritev pregledovalca, če jo izbrani GitHub načrt podpira. Ne vzpostavljaj univerzalnega SSH shell dostopa.

**4. Pogoji za objavo:** GitHub CI PASS → izolirana staging izdaja → preverjen HTTP/HTTPS in varnostni preflight → explicit approval → atomic switch `current`, ponovna preverba → varna povrnitev, če ni PASS.

## Kako bo deloval ukaz »izvedi« po aktivaciji

Ko bo enkratno vzpostavljen **izoliran** račun, varovani ključ in GitHub zaščita okolij, lahko asistent na zahtevo »izvedi« pripravi commit, zažene CI s spremembami kode in prek Actions sproži staging brez ročnega ponavljanja dela v cPanelu. Produkcijski preklop mora biti še vedno sledljiv, odobren in vezan na konkretno preverjeno izdajo. Če Go/no-go pogoji niso doseženi, se naloga ustavi s poročilom; ne razširjaj pooblastil za obhod zaščit.

Omejitev: trenutni povezovalnik GitHub ne omogoča neposrednega urejanja GitHub Secrets ali klikov cPanel, zato začetna ustanovitev izoliranega računa in varna nastavitev skrivnosti zahtevata uporabniško dejanje v ustrezni aplikaciji. Ni obljube, da je zdaj že omogočeno samodejno objavljanje.

## ChatGPT Project nastavitev

Da pravilo velja **v vsakem prihodnjem pogovoru in Work opravilu**, ga je treba vnesti tudi v *ChatGPT Project → Instructions*. GitHub `AGENTS.md` sam ne spremeni ChatGPT projektnih nastavitev. Pripravljeno besedilo je v `docs/FINAI_CHATGPT_PROJECT_INSTRUCTIONS.md`.
