# FinAI – FTPS staging priprava po obvestilu Hiper M (9. 11. 2026)

**Uporabnik je sporočil: »Hiper M je potrdil.«** Podrobnosti tehnične potrditve (izoliran OS uporabnik ali le virtualni FTP root) **še niso razvidne** iz priloženih dokazil. Ta izjava ne spremeni dejstva, da veljavna projektna pravila dovoljujejo FinAI na `laskot48` izključno read-only.

## Preverjeno

- cPanel Domains: `e-integrator.si` ima svoj document root `/home/laskot48/e-integrator.si`; Laškoteka je na `/home/laskot48/public_html`; STNG uporablja `/home/laskot48/apps/stng-production/current/public`.
- Seznam domen ne prikazuje `app.e-integrator.si` ali `api.e-integrator.si` kot samostojnih domen.
- `e-integrator.si` danes prikazuje predstavitveno stran, ne kompletnega FinAI portala.
- Obstoječi GitHub Actions build je uspešen in ustvari `finai-web-release.tar.gz` ter `finai-static-manifest.json`.
- Varovani SSH stage/prod je v ločeni verziji workflowa in ne sme teči pod `laskot48`.

## Nova izvedena priprava za prenos datotek

`ops/finai-ftps-offline-release-plan.py` se izvede v GitHub-hosted okolju, brez omrežnega dostopa:
1. Preveri celoten seznam tar.gz datotek proti SHA256 kontrolnemu manifestu.
2. Zavrne dodatne datoteke, pomanjkljive datoteke, drugačno vsebino, nevarne konfiguracijske in izvedljive datoteke, simbolne povezave, prehode `..` in razliko v velikosti.
3. Izračuna nespremenljivi SHA256 identifikator izdaje in ustvari `finai-offline-ftps-staging-plan.json`.
4. Plan vsebuje relativne poti `releases/<SHA256>/<datoteka>`, pripete kontrolne vsote in izrecni oznaki `transport=NOT_CONFIGURED` ter `host_writes=DISABLED`.
5. Na Hiper M se ne prenese nobena datoteka, saj končni `docroot` za `app` in pooblastila izoliranega uporabnika niso verificirana.

## Kaj je potrebno, da bi bili dejanski Hiper M prenosi mogoči

**Potrebna je konkretna tehnična informacija, kaj je ponudnik potrdil:**

- Ali je novi FinAI zapisovalni račun dejansko **drugačen Unix UID** od `laskot48`, z ločeno mapo, zbirko, pravicami in brez dostopa do Laškoteke/STNG?
- Ali je ponudnik potrdil le **chroot FTPS virtualnega uporabnika** pod istim `laskot48` UID? To samo po sebi ne izpolnjuje veljavnega projektnega pravila o neodvisni sistemski izolaciji.
- Kakšna je točna ciljna pot/testna poddomena (ne smemo ugibati) in ali je HTTPS oziroma zaščita pred indeksiranjem pripravljena?

Dokler je neznana ključna razlika, `FINAI_STAGE_ENABLED` in `FINAI_PRODUCTION_ENABLED` ostaneta izključena. Noben ključ, FTP uporabnik, `authorized_keys`, shared cPanel, DNS, certifikat, cron, servis ali podatkovna baza se ne spremeni. To **ne ovira** nadaljnjega razvoja, pregledov ali priprave izdaj v GitHubu.
