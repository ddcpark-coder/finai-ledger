# BACKEND-05 — razvoj FinAI na obstoječem Hiper M, poznejša selitev na samostojno gostovanje

**Odločitev naročnika: 4. november 2026.** Hiper M omogoča neomejeno dodatnih domen, **ne pa dodatnih, neodvisnih cPanel računov v istem paketu**. Za razvoj in preverjanje FinAI uporabimo obstoječi račun, ki trenutno gosti Laškoteko. **Pred javno produkcijsko uporabo** bo naročnik uredil povsem samostojno Hiper M gostovanje za FinAI.

**Status:** dogovorjen načrt, še brez nove domene, brez implementacije na Hiper M in brez posega v Laškoteko. Ta dokument nadomesti prejšnjo predpostavko, da je ločen račun pogoj že za razvoj; varnostna zahteva po samostojnem produkcijskem računu OSTANE.

## Faza A — razvoj v obstoječem računu (samo sintetični/testni podatki)

- Razvojna domena FinAI bo dodatna domena znotraj obstoječega Hiper M računa; ime ni določeno. Tudi poznejša zamenjava domene mora biti izvedljiva prek konfiguracije, brez ponovne namestitve poslovne logike in brez migracije poslovnih tabel zgolj zaradi imena domene.
- Najprej preveriti, da lahko *nova* domena varno kaže le v mapo `public` Laravel aplikacije. Koren projekta, `.env`, `vendor`, `storage`, zasebni dokumenti in logi morajo biti zunaj javnega document root. Če Hiper M ne omogoča varne korenske mape, **STOP** — ne ustvariti improvizirane javne Laravel namestitve.
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

1. Registrirati/izbrati domeno po odločitvi naročnika — **ime ni arhitekturna odvisnost**.
2. V obstoječem cPanelu ustvariti **novo dodatno domeno samo za FinAI**, če je mogoče nastaviti varen document root in DNS/SSL.
3. Potrditi ciljni `HOME`, `public_html` meje, stroškovno/varnostno primernost in zaščito za razvoj. **Ne spreminjati Laškotekinih nastavitev.**
4. Izvesti BACKEND-04 skript najprej `--dry-run`; po varni odobritvi `--apply`, nato pripraviti razvojno izdajo brez podatkov.
5. Odpreti namensko prazno MariaDB za FinAI po potrditvi ciljne obnove; najprej testirati read-only povezavo, nato pregledane migracije brez pravih podatkov.
6. Vzporedno dokončati aplikacijo; **pred produkcijsko objavo** slediti Fazi B.

## Kaj ni bilo izvedeno

Ta sprememba je samo projektna odločitev v dokumentaciji. **Ni** ustvarjena domena, API, DB, nova mapa, R1Soft kopija ali cron; nobena migracija ni bila pognana; Laškoteka ni spremenjena. BACKEND-04 PR #33 ostaja razvojni osnutek z varovanim pripravljalnim skriptom.

**Opomba o prejšnjem povpraševanju:** predlog pošiljanja ponudniku za samostojni razvojni račun je s to odločitvijo **nepotreben**; morebitni prejšnji neposlani Gmail osnutek naj se ne pošlje, razen če naročnik želi preveriti pogoje bodoče produkcijske selitve.
