# BACKEND-02 — poročilo 2026-11-03

## Izvedeno (GitHub/CI)
- Uradni Laravel Fortify 1.41.0: TOTP, potrditev vključitve, enkratne obnovitvene kode, zahteva po ponovni potrditvi gesla.
- Laravel 13.40.0/PHP 8.4; zaklenjen in preverjen `backend/composer.lock`.
- Stari password-only `/auth/login` odstranjen. Privilegiran uporabnik brez 2FA se lahko prijavi za vključitev TOTP, ne pa dostopati do finančnega API.
- Privilegirane API poti zahtevajo web/session guard: bearer token ne more obiti Fortify izziva.
- Privzeta produkcijska prijava ostaja blokirana: `FINAI_AUTH_RELEASE_ENABLED=false`.
- Dodana ločena frontend stran `/auth`, ki brez konfiguriranega API-ja ne prikazuje prijavnega obrazca.
- Read-only ukaz `php artisan finai:preflight [--database]` za preverjanje gostovanja; ne migrira in ne spreminja podatkov.
- Uvedeni CI `composer validate --strict`, `composer install` iz locka, `composer audit --locked`.
- Dokumentirani cPanel, MariaDB, SSL, varnostne kopije, Document Root in varni koraki za Hiper M.

## Dokazila QA
- PHP: **14 PASS / 68 assertions**.
- JS/browser: **18 PASS / 2 expected SKIP** na desktopnem Chromiumu in mobilni emulaciji.
- Composer audit: *No security vulnerability advisories found* ob izvedbi CI.
- Vercel feature preview: **READY**.
- Infrastrukturna produkcija: **NI testirana/NI nameščena na Hiper M**.

## Omejitve
1. CPanel in Hiper M gostovanje nista bila dostopna prek trenutnih orodij; PHP 8.4, MariaDB, SSL in docroot niso dejansko preverjeni na strežniku.
2. Laravel še ni nameščen na Hiper M in migracije niso izvedene proti produkcijski bazi.
3. Auth UI/Fortify nista testirana end-to-end na dejanskih first-party poddomenah; vse je testirano izolirano v CI.
4. Podatki o demonstracijskih podjetjih in moduli frontend še niso povezani z resnično uporabniško identiteto.
5. Celotna ERP migracijska zgodovina, produkcijsko upravljanje sej in reset gesla zahtevajo dodatno validacijo pred uporabo.
6. `FINAI_AUTH_RELEASE_ENABLED` se ne sme aktivirati pred QA na Hiper M in potrjenim 2FA za prvega administratorja.

## Naslednji varovan korak
Read-only pregled cPanela Hiper M; izolirana poddomena in baza; SSL; obnovitvena točka; namestitev zaklenjenih PHP odvisnosti, strogo ciljane migracije; testni uporabniki in preizkusi 2FA/401/403/409/CSRF; šele nato varna aktivacija first-party frontend povezave.

Natančna navodila: `docs/BACKEND_02_HIPER_M.md`.
