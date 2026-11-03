# BACKEND-04 — izolirana priprava Laravel API na Hiper M

**Datum:** 2026-11-03
**Stanje:** priprava kode in postopka na ločeni veji; **ni namestitve na Hiper M**, ni nove baze, DNS, cron sprememb ali migracij.

## 1. Kaj je že znano in česa NE preverjamo ponovno

Ugotovitve iz Laškoteke in BACKEND-03 prevzamemo brez ponovnih posnetkov zaslona:
- Hiper M/cPanel, PHP CLI 8.4.27, MariaDB SERVER 10.11.19, Composer 2.10.3, Git 2.56.0 ter PHP spletne možnosti (256M / 30 s / 20M upload / 50M POST).
- Na PHP Selectorju je omogočen `nd_pdo_mysql`; dejanski PDO `mysql` driver bo preveril Laravelov preflight na **novi ciljni namestitvi**, ne na Laškoteki.
- Laškoteka že uporablja cron opravila na 1 in 5 minut. Njenih razporedov **ne spreminjamo**. Razpoložljivost `crontab` sama po sebi ni potrditev zmogljivosti za dodatna opravila.
- R1Soft ima zgodovinsko potrjene dnevne obnovitvene točke za Laškoteko (29. 10. prikazanih 18). Uporabnik je predhodno potrdil preizkus obnove; neodvisni tehnični dokaz za celoten obnovitveni postopek je omejen. **R1Soft ne preverjamo ponovno za Laškoteko**. Po namestitvi FinAI enkrat preverimo, da so nove datoteke/baza vključene v kopiranje in da je obnova ciljno mogoča.
- V trenutnem cPanel računu je v Domains samo `laskoteka.si`, document root `/public_html`; AutoSSL je za obstoječo domeno delujoč. Ni registrirane/nastavljene FinAI domene.
- FinAI GitHub repozitorij obstaja in ima **public** vidnost (pred produkcijskimi integracijami ga prestaviti na private). Vercel trenutno služi razvojni frontend predogled; to **ni** potrjen računovodski produkcijski sistem.

## 2. Meja izolacije in infrastruktura

**Prednostno:** samostojen Hiper M cPanel uporabnik/gostovalni račun za FinAI z ločeno bazo, uporabnikom baze, mapami, domeno in obnovitvijo. Dodatna domena pod ISTIM cPanel uporabnikom ne pomeni procesne ali sistemske varnostne izolacije. Brez tega produkcijskih finančnih podatkov ne uvajamo v skupni račun z Laškoteko.

Začasno se lahko pripravi prazna struktura *brez osebnih/finančnih podatkov* v samostojni mapi:

```text
/home/<finai-cpanel-user>/apps/finai-ledger/
├── releases/
│   └── <reviewed-commit-sha>/backend/  # Laravel koda posamezne izdaje
├── shared/
│   ├── .env                           # samo na strežniku; ne v GitHub
│   ├── storage/                       # zasebni dokumenti, logi, seje
│   └── bootstrap-cache/               # v skupni namestitvi, če je potrebno
└── current -> releases/<sha>/backend  # atomarna zamenjava ŠELE pri izdaji
```

`api.<izbrana-domena>` mora kazati **samo** v `current/public` (nikoli v koren Laravela ali `laskoteka.si/public_html`). Če cPanel ne dovoli takega Document Root, je to **STOP**; ni varnega nadomestnega trika z razkritjem projekta v `public_html`.

`app.<izbrana-domena>` je bodoči first-party frontend; do tedaj je Vercel samo predogled z demo podatki. Enako registracijsko domensko območje je pomembno za Sanctum cookie/CSRF.

## 3. Varna priprava prazne strukture

Repozitorij vsebuje `backend/scripts/finai-backend04-scaffold.sh`. Skript lahko ustvari samo **NOVO** drevo `$HOME/apps/finai-ledger`, preveri dvoumne/simbolične cilje, zavrne obstoječo korensko mapo in ne dostopa do skrivnosti. Ne ustvari kode, `.env`, baze, DNS, `current` ali cron.

Po izrecni odobritvi ciljnega FinAI računa, ne v Laškotekinem terminalu:

```bash
bash backend/scripts/finai-backend04-scaffold.sh --dry-run
# šele po pregledu izpisa in pravilnega HOME:
bash backend/scripts/finai-backend04-scaffold.sh --apply
```

Ne izvajati `--apply` v obstoječem Laškoteka projektu. Scaffolding na GitHub/CI se testira na izoliranem začasnem HOME.

## 4. Ločena MariaDB (priprava, NE ustvarjanje)

Ko bo potrjen samostojni račun:
1. V cPanel *Database Wizard* ustvariti **novo FinAI** MariaDB bazo s charset `utf8mb4` in lastnim uporabnikom. Laškotekine baze in globalnih nastavitev ne spreminjati.
2. Ločiti migracijske pravice od običajnih runtime pravic, kolikor to omogoča cPanel; uporabiti najmanjše potrebne pravice.
3. Poverilnice vnesti izključno v `shared/.env` na strežniku (ne v terminalski izpis, klepet, GitHub, Vercel preview ali dnevniške datoteke).
4. Zahtevati `DB_CONNECTION=mysql` in preverjen PHP PDO `mysql` driver v dejanskem produkcijskem procesu.
5. Preveriti zgolj read-only povezavo `php artisan finai:preflight --database` (`SELECT 1`); brez ustvarjanja tabel v tej fazi.

## 5. Varovan postopek prve izdaje — še NI izveden

1. Potrditi novo domeno `app/api`, SSL, izolirano okolje, Document Root ter vhodne omejitve in rezervni načrt. Pred resničnimi podatki preveriti tudi zasebnost GitHub repozitorija.
2. Iz pregledanega Git SHA pripraviti nov direktorij `releases/<SHA>/backend`; namestiti `composer.lock` odvisnosti brez razvojnih paketov. Če Composer na Hiper M odpove zaradi omejitev procesov ali paketov, **STOP**, brez spremembe globalnih nastavitev Laškoteke.
3. Povezati `storage` in zasebni `.env` iz `shared` v izdajo. `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://api.<domena>`, `SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=lax`, `SESSION_DOMAIN=.<domena>`, `SANCTUM_STATEFUL_DOMAINS=app.<domena>,api.<domena>`, `FINAI_ALLOWED_ORIGINS=https://app.<domena>`.
4. Pustiti `FINAI_AUTH_RELEASE_ENABLED=false`. Preveriti `php artisan finai:preflight --database`, `php artisan route:list --path=api` ter varnost pred javnim dostopom do `.env`, `storage`, `vendor`.
5. Po sveži *ciljni* obnovitveni točki in reviziji migracij izvesti samo:
   ```bash
   php artisan migrate --path=database/migrations/2026_11_01_000001_create_identity_access_tables.php --force
   php artisan migrate --path=database/migrations/2026_11_03_000018_create_user_workspace_preferences.php --force
   ```
   **Ne** izvajati nezaščitenega `php artisan migrate --force` za vse stare ERP migracije. Brez javne registracije in brez realnih podatkov.
6. Pred aktivacijo prijave preveriti 401/403, tenant izolacijo, 2FA in recovery, CSRF, HTTPS/cookie in CORS na dejanskih first-party domenah. `FINAI_AUTH_RELEASE_ENABLED` ostane `false` do uspešnega QA.
7. Šele po potrditvi izvesti atomarni `current` symlink preklop ter minimalni smoke (health, auth zavrnitev, logi). Cron za FinAI uvajati ločeno in samo če je dejansko potreben.

### Vračanje (rollback)

- Kodo vrniti s preklopom `current` na prejšnjo preverjeno izdajo; `shared` ostane nedotaknjen.
- **Ne** izvajati avtomatskega DB rollbacka. Neobratne migracije zahtevajo ločen načrt; obnova je ciljna samo na FinAI bazo/datoteke, nikoli globalni R1Soft restore računa z Laškoteko.
- Če preflight, povezava ali varnostni test odpove, ustaviti izdajo brez aktiviranja prijave.

## 6. Kaj BACKEND-04 trenutno dokazuje

**Pripravljeno v kodi:** varen pripravljalni skript, natančnejši preverjevalnik PDO `mysql`, implementacijska/obnovitvena kontrolna lista in CI preizkus skripta.

**Ni izvedeno:** kreiranje cPanel računa, DNS/domene, produkcijske baze, `.env`, namestitev PHP kode, migracije, 2FA end-to-end ali produkcijski deploy.

**Nadaljnji resnični blokatorji:** ločena identiteta gostovanja za FinAI, registrirana domena ter pooblaščena varna vzpostavitev baze. Splošne preglede Laškoteke smatramo za zaključene in jih ne podvajamo.
