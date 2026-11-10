# FinAI Ledger — Laravel 13 API

Status: Identity/preferences Laravel API se uspešno zažene v PHP 8.4 CI. To še ni celoten računovodski backend.

## Zahteve
- PHP 8.4, Composer 2, PDO + pdo_mysql/pdo_sqlite, mbstring, openssl, XML in curl.
- MariaDB 10.11 za ciljno produkcijo na Hiper M; SQLite za CI.
- HTTPS, Document Root na mapi backend/public.

## Lokalni zagon
1. V mapi backend izvedi: composer install
2. Kopiraj .env.example v .env in ustrezno dopolni podatke. Nikoli ne objavljaj .env.
3. Izvedi: php artisan key:generate
4. Pri SQLite ustvari database/database.sqlite in DB_DATABASE nastavi na absolutno pot.
5. Za zdaj izvedi SAMO preverjeni migraciji:
   php artisan migrate --path=database/migrations/2026_11_01_000001_create_identity_access_tables.php
   php artisan migrate --path=database/migrations/2026_11_03_000018_create_user_workspace_preferences.php
6. Izvedi: php artisan route:list --path=api
7. Izvedi: php artisan serve --host=127.0.0.1 --port=8000

Ne izvajaj vseh starejših poslovnih migracij na živi bazi, dokler ni preverjeno njihovo zaporedje in skladnost.

## Sintetični API prejetih računov (izključeno v produkciji)

**Novo:** strogo omejeni API-poti za učenje poteka ustvarjanja in potrjevanja
*izključno demonstracijskih* računov. `FINAI_DEMO_WORKFLOWS_ENABLED=false`
je privzeto. Za lokalni, izolirani QA s sintetičnimi podatki lahko v namenskem
testnem okolju vključite `FINAI_DEMO_WORKFLOWS_ENABLED=true` in migracijo
`2026_11_11_000019_create_demo_incoming_invoices.php`, vendar ne izvajajte
migracije na skupnem računu Hiper M.

- `GET /api/companies/{companyId}/demo/incoming-invoices` — do 100 zapisov trenutnega podjetja.
- `POST /api/companies/{companyId}/demo/incoming-invoices` — ustvarjanje demo zapisa s potrditvijo `demo_only=true` in dovoljenjem `invoices.write`.
- `POST /api/companies/{companyId}/demo/incoming-invoices/{invoiceId}/approve` — dovoljenje `invoices.approve`, transakcijska odobritev in zapis v revizijsko tabelo.

Skupne omejitve: prijava, preverjen e-naslov, aktivno podjetje in članstvo,
pravice, dodatna 2FA za privilegirane vloge, zaščita CSRF, omejitve zahtev,
izolacija `company_id` in prepoved resničnih podatkov. To **niso** povezave
za produkcijsko knjigovodstvo, prejem PDF/XML ali shrambo originalov.
Frontend demo ostaja lokalni in ni priklopljen na te API-poti.

## Implementirane API-poti
- GET /up — health check
- GET /api/me — identiteta in aktivna podjetja
- GET /api/companies/{companyId}/my/workspace-preferences
- PUT /api/companies/{companyId}/my/workspace-preferences
- POST /auth/login — omejena prijava z geslom in verificiranim e-naslovom
- POST /auth/logout — odjava z invalidacijo seje
- GET /sanctum/csrf-cookie — CSRF mehanizem za SPA

API uporablja session/Sanctum, verified email, company membership Gate in zahteva expected_version; ob konfliktu vrne 409.

## Varnostna izolacija
Gate company.access preverja aktivnega uporabnika, verificiran e-naslov, aktivno podjetje in aktivno članstvo v company_user.
Podatki so vezani na user_id in company_id. Ne zaupamo uporabniškemu ID iz odjemalca.
Skrivnosti in produkcijski podatki se ne hranijo v repozitoriju.
Javna registracija ni omogočena.

## First-party domeni (primer, ne registrirana domena)
https://app.finai.si — Next.js frontend
https://api.finai.si — Laravel API na Hiper M

Laravel okolje:
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.finai.si
DB_CONNECTION=mysql in zasebni podatki o bazi
SESSION_DOMAIN=.finai.si
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SANCTUM_STATEFUL_DOMAINS=app.finai.si,api.finai.si
FINAI_ALLOWED_ORIGINS=https://app.finai.si

Frontend:
NEXT_PUBLIC_FINAI_API_BASE_URL=https://api.finai.si/api

Vzpostaviti je treba preverjeno CORS + CSRF konfiguracijo; vercel.app na nepovezani domeni ni zanesljiva first-party seja.

## Pred produkcijsko uporabo
- Potrditi Hiper M PHP 8.4, SSL, ločeno domeno in Document Root.
- Ustvariti obnovitveno točko DB/datotek pred migracijami.
- Dodati in potrditi composer.lock ter varnostno preveriti odvisnosti.
- Implementirati obvezno 2FA za Owner/Admin in recovery flow.
- Preveriti migracije iz celotnih ERP faz in integracije.
- Izvesti API teste 200, 401, 403, 409 in CSRF na dejanskih domenah.
- Šele nato omogočiti frontend API nastavitve in resnično sinhronizacijo.

Hiper M ni spremenjen. Ta repozitorij trenutno vsebuje zagonsko identitetno/UX rešitev in njene teste, ne povezane produkcijske aplikacije.
