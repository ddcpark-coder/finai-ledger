# FinAI NEXT43 — aktivacija namenskega Laravel API (25. 11. 2026)

## Namen in trenutno dejansko stanje

- FinAI spletni vmesnik je že javno objavljen na **https://app.e-integrator.si** z varovanim statičnim preklopom. Tega ne spreminjamo ali onemogočamo.
- **https://api.e-integrator.si/up** je ob zadnjem preverjanju vrnil **HTTP 404**. Pripravljen Laravel paket v GitHub Actions ni enak strežniški namestitvi.
- Namenski cPanel račun je **`einteg86`** (UID **1256**, `/home/einteg86`) in API docroot trenutno **`/home/einteg86/api.e-integrator.si`**.
- Obstoječi prisilno omejeni SSH prehod in `.github/workflows/finai-isolated-deploy.yml` sta **samo za statično Next.js izdajo**. Ne omogočata PHP/Laravel pisanja ali migracij. Razširjanje njunih pravic brez dodatnega namenskega pregleda ni dovoljeno.
- Laravel 13 / PHP 8.4 z zaklenjenimi Composer odvisnostmi se že pakira v `finai-private-laravel-release`, z manifestom in SHA256 posameznih datotek. Paket vsebuje **zasebno** kodo, ne samo web root.

## NEXT43 spremembe, izvedene na GitHubu

1. `GET /api/readiness` je privzeto izključen (`FINAI_API_READINESS_ENABLED=false`). Če je izrecno omogočen, izvaja samo `SELECT 1`; vrne le `{"status":"database-reachable"}` (200) ali `{"status":"unavailable"}` (503). V produkciji zahteva MySQL/MariaDB, `APP_DEBUG=false` in varne sejne piškotke. **Uspeh ne pomeni dovoljenja za pravi računovodski promet.**
2. Skript `ops/finai-api-host-readonly.py` je **izključno bralen**. Preveri dejanski in efektivni UID, ime računa in strežnika, kanonične poti brez simbolnih povezav, lastništvo, dovoljenja javnega korena in zasebnih map ter odsotnost izpostavljenih `.env*`, `vendor`, `config`, `storage` in drugih zasebnih map. Preveri različico in potrebne razširitve privzetega ter običajnih CloudLinux/cPanel PHP 8.4 **CLI** interpreterjev. Ni DB povezav, migracij, ustvarjanja datotek ali spreminjanja cPanel.
3. GitHub Laravel release package vsebuje še javno, neskrivno `public/finai-api-build.json` s preverljivo **točno** SHA izdaje; CI preveri `/up` in vsebino oznake.
4. Ciljni sintetični testi potrdijo spodnje varovalke in preverijo fail-closed odzive brez izpostavljanja podatkov.

## Posodobitev varnostne odvisnosti

Na CI varnostnem pregledu 25. 11. 2026 je bila zaznana napaka v zaklenjeni verziji `web-auth/webauthn-lib 5.3.12` (6 obvestil Composer). Na namenski GitHub razvojni veji je Composer s povezanim naborom varnih odvisnosti posodobil paket na **5.3.17**; CI je uspešno izvedel `composer validate` in `composer audit --locked`. Spremenjen je izključno `backend/composer.lock` (vključujoč nujne posodobitve povezanih paketov). Začasna pisalna GitHub Actions naloga za posodobitev je bila po uspehu odstranjena in **ni vključena v main**.

Prava namestitev mora uporabiti nespremenjeni, preverjeni paket iz novega `composer.lock`, brez izvajanja `composer update` na strežniku.

## KORAK A — diagnostika namenskega strežnika (brez pisanja)

Pod `einteg86` izključno na namenskem cPanel Terminalu se izvede pregledan/pinn-an skript iz točne združene GitHub revizije (komit iz PR); rezultat ne vsebuje skrivnosti. **Ne uporabljati drugega sistemskega uporabnika.**

Pričakovani izpisi:
```text
FINAI_API_ISOLATED_IDENTITY=PASS
FINAI_API_HOST_IDENTITY=PASS
FINAI_API_HOME=PASS
FINAI_API_DOCROOT=PASS
FINAI_API_PUBLIC_BOUNDARY=PASS
FINAI_API_PHP_CLI=PASS_CLI_ONLY
FINAI_API_PHP_CLI_ALT84=PASS_CLI_ONLY
FINAI_API_PHP_CLI_EA84=UNAVAILABLE
FINAI_API_PRIVATE_RELEASE_DIR=NOT_PRESENT
FINAI_API_EXISTING_PRIVATE_DIR=PRESENT_PRIVATE
FINAI_API_ACL_ISOLATION=NOT_VERIFIED
FINAI_API_PHP_WEB_HANDLER=NOT_VERIFIED
FINAI_API_WEBSERVER_MAPPING=NOT_VERIFIED
FINAI_API_DATABASE_ISOLATION=NOT_VERIFIED
FINAI_API_DEPLOY_AUTHORIZED=NO
```
To so primeri, ne vnaprej potrjeni rezultati. `PASS_CLI_ONLY` ne dokazuje različice PHP v Apache/FPM za API poddomeno. Dejanska PHP 8.4 nastavitev se preveri z namensko cPanel konfiguracijo in poznejšim HTTP smoke testom. Pri nezdružljivi različici ali manjkajočih razširitvah posamezni CLI izpiše `INCOMPATIBLE_CLI_ONLY` in imena manjkajočih razširitev; odsoten alternativni interpreter ni sam po sebi napaka. Status zasebne mape `PRESENT_PRIVATE` pomeni samo preverjeno lastništvo, pot brez symlinka in dovoljenja 0700 oziroma strožja; ne potrjuje ACL, vsebine, varnostne kopije ali dovoljenja za objavo. Če skript zazna javno `.env*`, `vendor` ali zasebni Laravel vir v API docrootu, se namestitev **ustavi**. `FINAI_API_READONLY_PREFLIGHT=PASS` je le rezultat pregledanih bralnih kontrol; `FINAI_API_DEPLOY_AUTHORIZED` ostane **NO**.

### Opažanja 27. 11. 2026

- V cPanelu je prikazan račun `einteg86`, domenski API docroot `/home/einteg86/api.e-integrator.si` in nastavitev računa PHP 8.4; to še ne potrjuje dejanskega PHP spletnega handlerja API.
- Vidna je baza `einteg86_finai_dev` (4 KB) brez dodeljenega uporabnika. Velikost ne dokazuje, da je baza prazna ali obnovljiva.
- cPanel Terminal je ob poskusu povezave in ponovni povezavi vrnil `The WebSocket handshake failed`. File Manager je pri odpiranju map vrnil `Data error`, phpMyAdmin pa je prikazal odgovor varnostnega preverjanja namesto strukture baze. Preverjanje ni bilo obideno.
- Do uspešnega read-only pregleda, dokaza izolacije, namensko omejenega uporabnika baze in preverljive obnove **ni dovoljena strežniška namestitev ali migracija**. Prejšnja statična varnostna kopija ne nadomešča dokazila za API in DB.

## KORAK B — zasebni Laravel root in namenski DB

Pod računom `einteg86` pripravi namensko zasebno izdajno strukturo, **ločeno od javnega API docroota**. Varen referenčni cilj za preverjanje z operaterjem:
```text
/home/einteg86/finai-api-deploy/
  releases/<sha256>/       # preverjena Laravel izdaja brez skrivnosti
  shared/.env              # zasebna konfiguracija, nikoli Git ali javni docroot
  shared/storage/          # zasebni podatki in dnevniki
  current -> releases/...  # atomarni kazalec, dovoljen šele po preflightu
/home/einteg86/api.e-integrator.si/  # JAVNO: samo Laravel public/
```
**Ne ustvarjaj vseh zgornjih poti avtomatsko in ne vstavljaj symlinkov na slepo.** Pred izvedbo najprej preveri dejansko obstoječo strukturo, relativne poti, datoteke .htaccess, PHP-FPM symlink podporo ter omejitve cPanel docroota. Laravel root (`vendor`, `.env`, `storage`, `config`, `database`) **nikoli** ne sme postati web root. Povezavo med stabilnim API docrootom in trenutno Laravel `public/` izdajo je treba izvesti z varovano, povrnljivo namestitvijo, združljivo s cPanel/Apache; ne spreminjaj drugih domen ali računov.

V cPanelu ustvari **izključno namensko FinAI** MariaDB bazo in uporabnika z najmanjšimi pravicami samo na tej bazi. Zabeleži ime baze in uporabnika v zasebno `.env` (ne v klepet/GitHub). Preveri `SHOW GRANTS FOR CURRENT_USER` in izrecno zavrni globalne pravice ali dostop do drugih baz. Pred **kakršnokoli** migracijo preveri OS uporabnika, realpath, symlink, hash izdaje, dejanski DB principal/database, pravice, DB backup + možnost restavracije.

## KORAK C — previdna aktivacija in smoke testi

1. Preveri PHP **8.4 web handler**, razširitve (`pdo_mysql`, `mbstring`, `openssl`, `xml`), lastništvo, potrebne mape ter HTTPS za poddomeno API. Ne usmerjaj na Vercel.
2. Preveri varnostno kopijo namenskega API in DB, povrnljivo prejšnjo izdajo. Prenos že preverjenega R1Soft **statičnega** arhiva spletnega vmesnika ne dokazuje obnovljivosti nove zasebne Laravel aplikacije ali baze.
3. Preveri `composer.lock` in `finai-laravel-manifest.json` ter SHA256 iz arhiva GitHub Actions pred razširitvijo samo v preverjenem namenskemu FinAI okolju. Strežniška namestitev ne sme izvajati `composer update` ali nenačrtovanih skriptov.
4. Konfiguriraj `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://api.e-integrator.si`, MySQL/MariaDB `DB_*`, `SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=lax`, `SESSION_DOMAIN=.e-integrator.si`, `SANCTUM_STATEFUL_DOMAINS=app.e-integrator.si,api.e-integrator.si`, `FINAI_ALLOWED_ORIGINS=https://app.e-integrator.si`. `APP_KEY` ustvari zasebno v okolju gostovanja; z njim se ob posodobitvah **ne rotira** brez načrtovane re-enkripcije podatkov.
5. Pred migracijo začasne namensko preverjene FinAI baze je obvezen izrecni predmigracijski pregled in obnova. Ne sproži `migrate:fresh` ali vseh poslovnih migracij na nepreverjeni živi bazi. Najprej namesti samo **preverjeni** identitetno/preferenčni osnovni migraciji in pregledan seeder samo v izolirani sintetični testni bazi.
6. Opravi `/up` (200), `/finai-api-build.json` (točen Git SHA), `/api/readiness` (200 le ob namenski preverjeni bazi in izrecni nastavitvi), zavrnitev neavtoriziranega `GET /api/me` (401), Fortify 2FA/CSRF smoke, poslovna izolacija company A/B (403), konflikta (409) in obnovljivost. Prijava v produkciji ostane `FINAI_AUTH_RELEASE_ENABLED=false` do dejanske odobritve in uspešnega QA.
7. Šele po preverjeni API namestitvi je dovoljeno nastaviti javno **neskrivno** frontend var. `FINAI_FRONTEND_API_BASE_URL=https://api.e-integrator.si/api` v GitHub Actions in izvesti zaščiten nov Next.js build. Nikoli ne vgraditi `.env` ali žetonov v statično aplikacijo.

## Stroge omejitve

Ta PR je **GitHub priprava in QA**, ne produkcijska namestitev. Ne spreminja cPanel, DNS, SSH ključev, MariaDB ali delujočega spletnega portala. Ne povečuje pooblastil obstoječega omejenega SSH prehoda. Brez dejanskih osebnih/računovodskih podatkov do zaključka varnostnega in računovodskega QA. Če katerakoli izolacija ni dokazana, se blokira samo nevarna strežniška operacija in razvoj v GitHubu nadaljuje.

## Kaj ostaja po NEXT43A

- Potrditi rezultat read-only host pregleda, **dejanski** API PHP handler in način cPanel docroot mappinga.
- Namenska baza in pravice, zasebni Laravel root, preverjen strežniški stage/promote/rollback in namenska DB obnova.
- Dejanska strežniška objava, prijava in UX v celoti povezana z Laravel API.
- NEXT44 enotni poslovni podatki in tokovi; NEXT45 dopolnitev funkcij/namizna/mobilna sinhronizacija.
