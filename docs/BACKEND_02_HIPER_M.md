# BACKEND-02 — Hiper M prednamestitveni pregled in varna uvedba

**Izvedeno:** Laravel Fortify TOTP/recovery, aplikacijski varnostni testi, zaklenjen Composer, read-only preflight.
**Neizvedeno:** prijava v Hiper M cPanel, produkcijska baza, nameščeni Laravel, DNS/SSL in popolni end-to-end preizkusi na resničnih domenah. Ločena odjemalska prijavna stran `/auth` je dodana, vendar brez konfiguriranega API-ja ostaja namerno neaktivna.

## Predpriprava (read-only, brez skrivnosti)

Na Hiper M je treba preveriti:
1. Razpoložljivost PHP 8.4 v cPanelu za izbrano (pod)domeno, PHP razširitve (pdo_mysql, mbstring, curl, intl, xml, zip, openssl) in Composer 2.
2. Dostop do SSH/Terminala (če ni na voljo, ločeno preverjen Composer-deploy in cron).
3. Samostojno MariaDB za FinAI, z najmanjšim potrebnim naborom pravic, brez deljenja s preostalimi projekti.
4. Document Root nove poddomene mora kazati izključno v `backend/public` in nikakor v `backend/` s konfiguracijo.
5. HTTPS certifikat, preverjena URL preusmeritev na HTTPS, brez javnega dostopa do `.env`, `storage/`, `vendor/`, backup datotek.
6. Dovoljen dostop pisanja samo v `storage/` in `bootstrap/cache/`, pravilna identiteta PHP uporabnika.
7. Ločeni domenski imeni pod isto first-party domeno (npr. `app.example.si` in `api.example.si`). Začasni `vercel.app` in druga nepovezana domena nista primerni za preverjeno Sanctum sejo.
8. Velikosti upload, timeout, cron, queue worker model, SSL/TLS in odzivnost povezave.
9. Hiper M backup datotek in MariaDB: konkreten uspešen obnovitveni preizkus na testnih podatkih.
10. Domena, zaščitena identiteta in prvi uporabniki z obveznim 2FA — brez testnih/privzetih produkcijskih gesel.

## Varna namestitev (ko obstaja cPanel/SSH dostop in so preflight pogoji potrjeni)

Najprej ustvariti GitHub release tag na preverjenem `main`, pripraviti ločeno mapo aplikacije zunaj webroot, namestiti zaklenjene odvisnosti:

```bash
cd /secure/finai/backend
composer validate --strict --no-check-publish
composer install --no-dev --prefer-dist --no-interaction --classmap-authoritative
php artisan finai:preflight --database
```

**Preflight je read-only.** Ne izvede migracij in ne odklepa prijave. Izpisuje zgolj PASS/FAIL, brez poverilnic.

Samo po obnovitveni točki in ročni reviziji dveh migracij:

```bash
php artisan migrate --path=database/migrations/2026_11_01_000001_create_identity_access_tables.php --force
php artisan migrate --path=database/migrations/2026_11_03_000018_create_user_workspace_preferences.php --force
```

**Ne izvajaj `migrate` brez `--path` za celoten ERP.** Celotna migracijska zgodovina še nima potrjenega zaporedja za živo bazo.

## 2FA / prijava
- Uradni Laravel Fortify uporablja TOTP, potrditev kode pred aktivacijo in obnovitvene kode.
- Ločen frontend `/auth` podpira prijavo, TOTP/obnovitveno kodo ter vključitev novega TOTP po ponovni potrditvi gesla. V predogledu brez nastavitve API ne sprejema prijav.
- Fortify skrbi za enotno prijavo/odjavo in zaščitene 2FA endpoints, brez javne registracije.
- Lastni stari `/auth/login` je odstranjen, da ni obvoda.
- Owner/Admin morata imeti potrjeno 2FA. Brez nje se prijava in privilegiran API zavrneta.
- **`FINAI_AUTH_RELEASE_ENABLED=false` ostaja privzeta produkcijska varovalka.**
- Osnovni frontend 2FA je pripravljen; še vedno je treba preizkusiti dejanski tok s prijavo na Hiper M in varen vpis prvega administratorja.
- Ključi za TOTP in recovery se ne zapisujejo v loge ali API `/me`.

## Produkcijska povezava (še ni aktivna)

Potrebujemo izbrano first-party domeno in usklajene nastavitve:
- Laravel API: `APP_URL=https://api.<domena>`, `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=lax`, ustrezen `SESSION_DOMAIN`.
- `SANCTUM_STATEFUL_DOMAINS=app.<domena>,api.<domena>`
- `FINAI_ALLOWED_ORIGINS=https://app.<domena>`
- Frontend: `NEXT_PUBLIC_FINAI_API_BASE_URL=https://api.<domena>/api`
- `FINAI_AUTH_RELEASE_ENABLED=false` do potrditve testov in 2FA vključno z obnovitvijo.

## Minimalna produkcijska QA matrika
- Prijava z nepravilnim geslom (422), TOTP izziv in invalid OTP, veljaven OTP in recovery.
- Odjava povzroči 401 na `/api/me`, star CSRF token ne omogoča zahtev, preverjena session rotacija.
- 401 brez prijave, 403 druga/suspendirana družba, 409 konflikt verzije, 422 neveljaven payload.
- Browser devtools omrežni zahtevki preverjeni z dejanskega first-party frontenda v Chrome/Safari.
- Rešitev za nedosegljiv API ostane lokalna, vendar jasno označena.
- Rollback: restore DB/datotek/konfiguracije iz potrjene obnovitvene točke.

**Ne uporabljati produkcijskih podatkov za začetne preizkuse.** Hiper M/SQL ni bil spremenjen med to fazo.
