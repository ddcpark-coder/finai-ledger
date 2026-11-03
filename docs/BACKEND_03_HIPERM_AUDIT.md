# FinAI BACKEND-03 – read-only pregled Hiper M
**Datum:** 3. november 2026  
**Način:** pregled povezanega Vercel projekta in GitHub CI + **izpis dejansko izvedenega read-only skripta v cPanel Terminalu na Hiper M**, ki ga je 3. 11. 2026 posredoval uporabnik. Brez spreminjanja nastavitev strežnika.

## Dejanska ugotovljena dejstva

| Kontrolna točka | Stanje | Utemeljitev |
|---|---|---|
| FinAI Vercel preview | POTRJENO | V projektu sta `finai-ledger-bay.vercel.app` in `finai-ledger-git-main-c-park117.vercel.app` |
| Lastna domena vezana na FinAI Vercel projekt | NI POVEZANA | Pregled nastavitev trenutnega projekta Vercel |
| Laravel/PHP 8.4 v GitHub testih | PREVERJENO V CI | Prejšnja faza BACKEND-02, **ne** Hiper M |
| TOTP, obnovitvene kode in izključena produkcijska prijava | PREVERJENO V CI | 14 PHP testov, 68 preverjanj v prejšnji fazi |
| PHP CLI 8.4 na Hiper M | POTRJENO | Uporabnikov terminalski izpis: PHP 8.4.27, `/opt/alt/php84/usr/bin/php`; PHP za bodočo **domeno** še ni preverjen |
| PHP CLI razširitve | POTRJENO | pdo_mysql, mbstring, curl, intl, dom, xml, zip, openssl, fileinfo vse ENABLED; ne dokazuje spletne PHP-FPM konfiguracije |
| MariaDB server verzija | NEPREVERJENO | CLI `mysql --version` preverja odjemalca, ne strežnika |
| cPanel Terminal | POTRJENO | Uporabnik je uspel zagnati read-only skript; to **ne dokazuje zunanjega SSH** dostopa |
| Git, Composer 2 in cron na Hiper M | POTRJENO ZA CLI | Git 2.56.0; Composer 2.10.3; `crontab` v PATH, ne potrjuje dejanske možnosti ustvarjanja cron opravil |
| SSL in DNS za lastni FinAI app/API domeni | NEPREVERJENO | Domeni nista določeni/povezani |
| Document Root `backend/public` | NEPREVERJENO | FinAI strežniška namestitev še ni izvedena |
| Izolirana MariaDB, kvote, kopije in obnovitev | NEPREVERJENO | Ni dostopa do nastavitve konkretnega FinAI računa |
| Dejanska produkcijska namestitev in end-to-end API | NI IZVEDENO | V tej fazi ni bilo sprememb na Hiper M |

**Pomembna ločitev:** cPanel lahko *podpira* MariaDB 10.11, vendar to ni dokaz različice na gostovanju. Prav tako lahko druga aplikacija uporablja isti ponudnik, kar ne dokazuje razpoložljivosti ali nastavitev za FinAI.

## Diagnostični paket (izveden na Hiper M)

Datoteka: `backend/scripts/hiperm-readonly-check.sh`

Vsebuje samo read-only ukaze: PHP CLI in razširitve, razpoložljive binarne poti PHP 8.4, Composer, Git, Node, OpenSSL, MySQL/MariaDB **odjemalca**, cron command in sistemske kvote. Ne bere okolijskih skrivnosti, ne odpira baznih povezav, ne izvaja omrežnih zahtev in ne zapisuje datotek.

Če je repozitorij že na Hiper M, zagon v cPanel > Terminal:
```bash
bash backend/scripts/hiperm-readonly-check.sh
```

Če repozitorija ni, **ga ne nameščaj samo za pregled**: odpri skript v GitHubu ter njegovo preverjeno vsebino kopiraj v cPanel Terminal. CPanel mora biti prijavljen na pravi račun; ni treba nikamor posredovati gesel.

## Izpis iz dejanskega gostovanja Hiper M

Preverjeno 2026-11-03 z read-only pregledom v uporabnikovem cPanel Terminalu.

| Parameter | Potrjena vrednost | Opomba |
|---|---|---|
| OS / arhitektura | Linux / x86_64 | Podpora za PHP/Laravel |
| PHP CLI | 8.4.27 | PHP_BINARY `/opt/alt/php84/usr/bin/php`; domači PHP domen še neznan |
| PDO gonilniki | mysql, pgsql, sqlite | Med njimi PDO MySQL |
| Zahtevane PHP razširitve | pdo_mysql, mbstring, curl, intl, dom, xml, zip, openssl, fileinfo | Vse vključene v CLI |
| Composer | 2.10.3 | Prisoten |
| Git | 2.56.0 | Prisoten |
| OpenSSL | 3.5.8 | Prisoten |
| MariaDB CLI | 10.11.19 (odjemalec) | Ne dokazuje DB server različice |
| Node / npm v PATH | Ni najdeno | Ni blokada za Vercel frontend / Laravel API |
| PHP CLI memory_limit | 256M | Preveriti spletni PHP in končno kapaciteto |
| PHP CLI max_execution_time | 0 | V CLI 0 pomeni neomejeno; ne dokazuje web timeouts |
| PHP CLI upload_max_filesize | 20M | Spletna nastavitev je lahko drugačna |
| PHP CLI post_max_size | 50M | Spletna nastavitev je lahko drugačna |
| Cron ukaz | Na voljo | Konfiguracija Cron Jobs še ni pregledana |
| Prostor na datotečnem sistemu | 450.8 GiB prosto | Ne predstavlja nujno kvote hosting računa |

**Ocena:** osnovni PHP/Laravel predpogoji so v CLI **PASS**; gostovanje je tehnično obetavno. Celotna produkcijska namestitev ima še odprte infrastrukturne pogoje (stvarna DB server verzija, web PHP, SSL, domene, backup, dok. koren, varnostna konfiguracija).

## Preostale preverbe v cPanel (izključno ogled)

1. **MultiPHP Manager ali Select PHP Version:** ali je PHP 8.4 na voljo za želeno domeno in katere razširitve so aktivne.
2. **Terminal / SSH Access:** delovanje terminala, dovoljen dostop s SSH, morebitne omejitve izvajanja Composer/Git.
3. **Databases / phpMyAdmin:** dejanska MariaDB/MySQL server verzija, pravice, namestitvene kvote. Ne ustvarjaj baze še.
4. **Domains in SSL/TLS Status:** ali obstaja primerna FinAI domena ter ali sta `app.` in `api.` v istem first-party registracijskem območju; korenska mapa, DNS in certifikat.
5. **Backup/Restore:** preveri obstoj povratne točke in pot do varne obnove, ne sprožaj obnove.
6. **Cron Jobs in Resource Usage:** PHP limiti, prosti prostor, CPU/RAM/procesi, možnost kratkotrajnih ozadnih opravil.

## Varnostni prehod

BACKEND-03 lahko dobi status **PASS na gostovanju** šele po resničnem read-only pregledu. Do takrat ostanejo `FINAI_AUTH_RELEASE_ENABLED=false`, brez migracij na Hiper M, brez lastnih domen, nameščenega API-ja, testnih uporabnikov ali vklopa sinhronizacije.

**Naslednji izvedljivi korak:** brez Work izvedi samo vizualni pregled cPanel → phpMyAdmin (različica *strežnika*, brez odpiranja podatkov), MultiPHP Manager/Select PHP Version (PHP per-domain), Domains + SSL/TLS Status, Backup/JetBackup, Resource Usage in Cron Jobs. Posreduj samo tehnične podatke ali PS brez občutljivih informacij; produkcijskih migracij ne izvajaj.
