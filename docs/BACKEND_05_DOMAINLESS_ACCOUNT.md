# BACKEND-05 — e-integrator.si: razvoj FinAI na obstoječem Hiper M, poznejša selitev na samostojno gostovanje

**Odločitev naročnika: 4. november 2026.** Hiper M omogoča neomejeno dodatnih domen, **ne pa dodatnih, neodvisnih cPanel računov v istem paketu**. Za razvoj in preverjanje FinAI uporabimo obstoječi račun, ki trenutno gosti Laškoteko. **Pred javno produkcijsko uporabo** bo naročnik uredil povsem samostojno Hiper M gostovanje za FinAI.

**Status (4. 11. 2026):** domena `e-integrator.si` je registrirana in **uspešno dodana** kot ločena dodatna domena v obstoječem cPanel računu. cPanel je izpisal `Success` in Document Root `/home/laskot48/e-integrator.si`, medtem ko ima Laškoteka `/home/laskot48/public_html`. Možnost **Share document root** je bila izključena. HTTPS/AutoSSL za e-integrator.si še ni potrjen (v seznamu domen je vprašaj pri Force HTTPS Redirect), DNS še ni preverjen; Laravel/API, MariaDB in cron niso vzpostavljeni, Laškoteke nismo spreminjali. Ta dokument nadomesti prejšnjo predpostavko, da je ločen račun pogoj že za razvoj; varnostna zahteva po samostojnem produkcijskem računu OSTANE.

## Faza A — razvoj v obstoječem računu (samo sintetični/testni podatki)

- Domena FinAI je **`e-integrator.si`**. Predlog hostov: `e-integrator.si` = predstavitvena stran (kasneje), `app.e-integrator.si` = frontend Next.js (na Vercelu), `api.e-integrator.si` = Laravel API (na Hiper M). Uporaba korenske domene na Hiper M še ni odločena; lahko ostane na Vercelu.  Tudi poznejša zamenjava domene mora biti izvedljiva prek konfiguracije, brez ponovne namestitve poslovne logike in brez migracije poslovnih tabel zgolj zaradi imena domene.
- Najprej preveriti, da lahko **API domena** varno kaže le v mapo `public` Laravel aplikacije. Koren projekta, `.env`, `vendor`, `storage`, zasebni dokumenti in logi morajo biti zunaj javnega document root.
- **Pozor: omejitev cPanel:** po dokumentaciji cPanel je Document Root dodatne domene privzeto pod `public_html`, zunaj njega pa le, če strežniška nastavitev WHM *Restrict document roots to public_html* to dopušča. Ne predpostavljaj, da bo `$HOME/apps/finai-ledger/current/public` neposredno dosegljiv kot Document Root v trenutni konfiguraciji. Referenci: https://docs.cpanel.net/cpanel/domains/domains/create-a-new-domain/ in https://support.cpanel.net/hc/en-us/articles/360050710393-Can-cPanel-users-create-subdomains-and-addon-outside-of-the-public_html-directory
- Če zunanjega docroot ni mogoče izbrati, **ne premikati celotnega Laravela v `public_html`**. Pred nadaljevanjem posebej zasnovati/varnostno preveriti minimalno `public` vstopno točko, ki zaganja zasebni Laravel izven `public_html` (in preprečiti nenamerno dosegljivost prek `laskoteka.si/<pot>`), ali pridobiti ustrezno nastavitev ponudnika. Do potrjene rešitve je HTTP namestitev **STOP**, CLI razvoj pa lahko teče izolirano.
- V razvojni fazi uporabiti zasebno mapo, npr. `$HOME/apps/finai-ledger`, in **samostojno novo MariaDB** bazo ter DB uporabnika z najmanjšimi potrebnimi pravicami; nikoli DB uporabnikov Laškoteke.
- Obstoječi BACKEND-04 skript `backend/scripts/finai-backend04-scaffold.sh` je samo za prazno drevo in ima `--dry-run`. Zaradi skupnega cPanel računa `--apply` dovoliti šele po potrditvi varne poti in ciljne obnovitvene točke. Skript ne zagotavlja izolacije na ravni operacijskega sistema.
- Laravel `APP_ENV=production` se lahko uporabi za preverjanje varnih HTTP nastavitev na javnem HTTPS strežniku, **a okolje ostaja neprodukcijsko**. `APP_DEBUG=false`, `FINAI_AUTH_RELEASE_ENABLED=false`; ne objavljati aktivne javne prijave, administracije ali dejanskih računovodskih podatkov.
- Uporabljati izključno izmišljene partnerje, račune, banke, e-poštne naslove in druge testne podatke. Nobenih osebnih podatkov resničnih strank, pravih davčnih številk, bančnih podatkov, dokumentov ali produkcijskih integracij.
- Razvojni API mora biti omejen pred nepooblaščenim dostopom (npr. IP allowlist/HTTP auth, če združljivo s testiranimi potmi); njegova prisotnost na istem cPanel računu **ne pomeni** izolacije od Laškoteke. Pred poskusi Fortify/Sanctum preveriti, da zaščita okolja ne pokvari CSRF/2FA QA.
- Cron opravila FinAI naj se ne vklapljajo samodejno in ne vplivajo na obstoječe Laškotekine razporede; enako velja za PHP globalne nastavitve, `public_html`, obstoječe SSL/DNS in R1Soft.
- Ločen GitHub repo `ddcpark-coder/finai-ledger` je trenutno `public`; pred dodajanjem kakršnihkoli občutljivih nastavitev ali dostopnih podatkov ga nastaviti na `private` (skrivnosti ne sodijo v repozitorij niti takrat).
- Next.js ostane na Vercelu kot razvojni frontend. Nobenih pravih strank do ločenega produkcijskega računa.

**Varnostna meja:** Dodatna domena, mapa in DB ustvarijo **logično organizacijsko ločitev**, ne pa prave varnostne ločitve uporabnikov ali procesov. Obe aplikaciji delita cPanel/OS uporabnika, pravice nad datotekami, resurse in možne skupne obnovitvene postopke. To je sprejemljivo le za razvoj brez resničnih podatkov in pod pogojem, da z novimi spremembami ne ogrozimo Laškoteke.

## Faza B — prehod na povsem samostojen Hiper M račun

Prehod pripraviti **pred** aktivacijo prvih pravih uporabnikov in resničnih finančnih podatkov. Aplikacijo lahko vsebinsko dokončamo v razvojni fazi, vendar je treba zaključne produkcijske varnostne in integracijske teste opraviti v novem okolju.

1. Naročnik uredi samostojen Hiper M paket/cPanel uporabnika za FinAI.
2. V novem okolju ločeno namestiti isto pregledano izdajo Laravela (Git SHA, Composer lock) in konfiguracijo `shared/.env`; preveriti PHP 8.4/PDO mysql, izolacijo map in pravilen `public` Document Root.
3. Ustvariti novo namensko MariaDB, varno prenesti samo testno/prehodno shemo in po potrebi preizkusne podatke; za začetek brez realnih računovodskih zapisov. Prenos se izvede po ločenem načrtu, brez posega v Laškotekino bazo.
4. Nastaviti končno domeno ali usmeriti že izbrano domeno na nov račun; SSL/AutoSSL, `APP_URL`, `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `FINAI_ALLOWED_ORIGINS` in frontend API base URL.
5. Vzpostaviti FinAI-specifične R1Soft obnovitvene točke in preveriti ciljno obnovljivost baze/datotek na novem računu. Splošnih preverjanj Laškoteke **ne ponavljamo**.
6. Minimalni produkcijski funkcionalni in varnostni testi: prijava/odjava, Fortify TOTP 2FA in recovery, CSRF/CORS, varni piškotki HTTPS, tenant izolacija, pravice, 401/403 in health. Prijava ostane zaklenjena (`FINAI_AUTH_RELEASE_ENABLED=false`) do potrditve.
7. Odobren, dokumentiran preklop, preverjen rollback, nato omejena aktivacija. Staro razvojno okolje brez pravih podatkov se lahko po prehodu odstrani ločeno in s potrditvijo.

## Praktični vrstni red po potrditvi domene

1. **ZAKLJUČENO:** domena `e-integrator.si` je registrirana, kar potrjuje e-pošta Domenca.com ob 13:07 dne 4. 11. 2026.
2. **ZAKLJUČENO:** nova dodatna domena `e-integrator.si`, Document Root `/home/laskot48/e-integrator.si` (zunaj `/public_html`); nesouporaba korenske mape potrjena. To dokazuje, da cPanel **omogoča ločen root za dodatno domeno izven `/public_html`** v tem računu. Ali je mogoče neposredno kazati v `~/apps/finai-ledger/current/public` in ali so sinhronizacijske povezave dovoljene, je treba še preizkusiti brez posega v žive datoteke.
3. **NASLEDNJI KORAK:** preveriti pri registrarju/cPanelu, da `e-integrator.si` dejansko uporablja pravilne DNS strežnike. V cPanel SSL/TLS Certificates > Status preveriti AutoSSL za `e-integrator.si` (ne vklapljati Force HTTPS Redirect, dokler certifikat ne velja). Potrditi še novo `api.e-integrator.si` poddomeno in njeno namensko `public` mapo, preden se karkoli namesti. **Ne spreminjati Laškotekinih nastavitev.**
4. Izvesti BACKEND-04 skript najprej `--dry-run`; po varni odobritvi `--apply`, nato pripraviti razvojno izdajo brez podatkov.
5. Odpreti namensko prazno MariaDB za FinAI po potrditvi ciljne obnove; najprej testirati read-only povezavo, nato pregledane migracije brez pravih podatkov.
6. Vzporedno dokončati aplikacijo; **pred produkcijsko objavo** slediti Fazi B.

## Kaj ni bilo izvedeno

Ta sprememba je samo projektna odločitev v dokumentaciji. **Ni** ustvarjena domena, API, DB, nova mapa, R1Soft kopija ali cron; nobena migracija ni bila pognana; Laškoteka ni spremenjena. BACKEND-04 PR #33 ostaja razvojni osnutek z varovanim pripravljalnim skriptom.

**Opomba o prejšnjem povpraševanju:** predlog pošiljanja ponudniku za samostojni razvojni račun je s to odločitvijo **nepotreben**. Prejšnji neposlani Gmail osnutek naj se ne pošlje, razen če naročnik želi preveriti pogoje bodoče produkcijske selitve.

**Obvezna ločitev DNS:** če so NS/registrar že vezani na ponudnika, preveriti le DNS za novo domeno; nikoli ne spreminjati zone `laskoteka.si`. V izogib presenečenjem ne prestavljati NS za `e-integrator.si` brez načrta in predhodne ugotovitve, ali so tam druge storitve (npr. e-pošta).
