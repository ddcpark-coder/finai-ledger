# BACKEND-06 — načrt domene in uvedbe FinAI

Stanje na 4. 11. 2026; osnovna koda: `backend-05-domainless-provisioning`, SHA `722d524ce3aafd4a32473ace0cb062dd61d5c134` (PR #34, ki temelji na osnutku #33). To je priprava, ne dovoljenje za spremembo gostovanja. Prepoved vseh posegov na Hiper M velja do nove izrecne odobritve; menjava datuma je ne prekliče. Ne izvajaj strežniških ukazov iz tega dokumenta, dokler ta prepoved velja.

## Preverjeno stanje in meje

- Izvor: PHP `^8.4`, Laravel `^13.17`, Fortify `^1.41`, Sanctum `^4.3.1`; zaklenjene odvisnosti obstajajo. CI na glavah PR #33 in #34 je bil uspešen; PHPUnit uporablja izolirani SQLite in le migraciji 001 in 018. Na veji BACKEND-06 je dodatni CI uspešno izvedel migraciji 001 in 018 ter ponovitev na izolirani MariaDB 10.11 (GitHub Actions run 41856235050, SHA 487bb3a4f9510562364636541f95784f1857a551). To še ni potrditev dejanske namestitve ali browser CSRF/2FA. ERP HTTP API ni dokončan.
- Osnovni dostop je web session; za obstoječe preferences API company Gate preverja članstvo, aktivno podjetje in uporabnika. Preskusi so za to področje, ne dokazujejo izolacije še neintegriranih ERP modulov. Fortify omogoča 2FA in recovery; začetna prijava v `production` je omejena z `FINAI_AUTH_RELEASE_ENABLED=false`. Ta omejitev ni nadomestilo za omrežno zaščito, še posebej ne pri drugih `APP_ENV`, ali za obstoječe seje. Pred uporabo potrebujemo ločeno testiranje vseh prijavnih tokov in izrecno varno zaprtje obstoječih sej.
- GitHub je javen; vidnosti nismo spreminjali. Pred občutljivimi informacijami in dejanskimi podatki predlagamo zasebni repozitorij; skrivnosti ne sodijo niti v zasebnega. Ciljno preveriti tudi zgodovino in preklicati/rotirati morebitne izpostavljene poverilnice; sama sprememba vidnosti zgodovine izpostavitve ne odpravi.
- Vercel: projekt `finai-ledger` vezan na istoimenski GitHub, zadnji pregledani deployment PR #34 `READY` in `target=null` (preview); lastni domenski imeni `app` ni nastavljeni v pregledanih podatkih. Podatkovne spremenljivke so bile pregledane samo po imenih brez dešifriranja; vidne niso bile nobene, morebitne skrite produkcijske vrednosti niso bile ocenjene. Nove domene ali objave niso bile nastavljene.
- Podatek o ločeni mapi osnovne domene in veljavnem SSL je prevzet iz naročnikovega stanja, ne na novo preverjen. Zmogljivost cPanel, da *poddomeno* usmeri neposredno v `current/public` oziroma sledi povezavi, ostaja nepotrjena. Napačno speljan Laravel root je razlog STOP. Samostojna mapa in baza znotraj istega cPanel uporabnika ne pomenita varnostne ali procesne izolacije od Laškoteke.

## 1. Ciljne domene in varna konfiguracija (načrt)

| Ime | Namen | Predvidena povezava |
|---|---|---|
| `e-integrator.si` | predstavitvena stran | ločena odločitev, ne posegati danes |
| `app.e-integrator.si` | Next.js | Vercel, šele po dovoljenju in preveritvi DNS |
| `api.e-integrator.si` | Laravel | Hiper M, document root izključno `current/public` |

Po odobritvi ustvariti samo potrebne DNS zapise po navodilih dejanskega ponudnika, preveriti lastništvo, morebitne obstoječe zapise in pošto; ne spreminjati DNS območja Laškoteke ali NS brez ločene presoje. Certifikata za obe poddomeni morata pokrivati vsako ime; veljaven certifikat osnovne domene tega sam ne dokazuje. Vercel in Hiper M vsak potrdita lasten TLS in pravilno usmerjanje. Razvojni `vercel.app` in API na `e-integrator.si` nista ista registrabilna domena: ne širiti CORS ali spuščati varnosti piškotkov zaradi obvoda. First-party auth testirati šele na načrtovani domeni.

Vzorčna prihodnja zasebna konfiguracija je v `backend/deploy/hiperm.env.example`. V njej ni ključev. Uporabiti lastni neodvisni `APP_KEY`, ki se varno hrani med izdajami in selitvijo; izguba ali menjava onemogoči dešifriranje že šifriranih podatkov, zato ob menjavi potrebujemo ločen načrt. `SESSION_DOMAIN=.e-integrator.si` razširi piškotke na poddomene; uporabi samo, če so vse vključene poddomene zaupanja vredne; preizkusi uporabo ožje nastavitve, ne predpostavi enakovrednega delovanja CSRF. `FINAI_ALLOWED_ORIGINS` je natančen seznam izvorov, brez `*`; `NEXT_PUBLIC_FINAI_API_BASE_URL` je javen v JS buildu, ne sme vsebovati skrivnosti. Spreminjanje frontend env zahteva novo gradnjo, ki sedaj ni dovoljena.

## 2. Zasnova izdaj in zaščita

Za začasni sintetični razvoj: `/home/laskot48/apps/finai-ledger/{releases,shared}`; v `releases/<SHA>/backend` je celoten pregledan backend s svojo `vendor` in *lastnim* `bootstrap/cache`. `shared/.env` (zasebne pravice), `shared/storage` (vključno z zasebnimi dokumenti in logi) ostaneta zunaj vseh javnih korenov; posamezna izdaja nanju kaže s preverjenima povezavama. Ne deliti `bootstrap/cache` med izdajami: lahko vsebuje poti in staro konfiguracijo. `current` kaže na backend izbrane izdaje; javni docroot je `current/public` in nikoli koren aplikacije ali Laškotekin `public_html`. Uporabljati `umask 077`, pravice preveriti glede na dejanskega PHP uporabnika; 0700 je lahko nezdružljiv z ločenim uporabnikom spletnega strežnika. Ne uporabljati world-readable bližnjic. Poleg docroota preveriti tudi nadomestne URL-je, alias, symlink, dostop do `.env`, `storage`, `vendor`, `.git` in izvorne kode — samo z neobčutljivimi označevalci, pred izpostavitvijo.

**Docroot STOP:** če cPanel tega ne omogoča ali se poti/aliasi ne dajo varno dokazati, pridobiti rešitev ponudnika in narediti nov pregled. Ni samodejne odobritve za kopiranje celotnega Laravela v javno mapo ali za uporabo javnega wrapperja. `backend/scripts/finai-backend06-path-check.sh` samo lokalno preveri kanonične poti; ne preizkuša HTTP, zaščite symlinkov ali izolacije in ne spreminja ničesar.

**Priprava/rollback po novi odobritvi:** pripraviti novo različico iz nespremenjenega pregledanega SHA, odvisnosti iz locka in preveriti podpise/artefakte; zasebni `.env` in `storage` ostaneta skupna. Pred preklopom preveriti *točen cilj*, dovoljenja, konfiguracijo, povezavo do ločene testne baze, PHP-PDO MySQL v dejanskem spletnem procesu, rezervno kopijo ter obnovo. Šele po ločeni odobritvi in uspešnih preverjanjih zagotoviti atomarno zamenjavo `current` na isti datotečni sistem; preveriti združljivost PHP opcache in časovnega cachea ponudnika. Predpisati in preizkusiti varen postopek s ponudnikom; tukaj ni avtomatskega `ln -sfn` ali restarta storitev. Rollback: vrniti povezavo na prej preverjeno izdajo, samo če je združljiva z aktualno shemo; preveriti FinAI health/log. Ne izvajati samodejnega `migrate:rollback`, `migrate:fresh` ali skupne obnove računa. Če je shema nezdružljiva, FinAI ustaviti in po ločeni odobritvi ciljno obnoviti samo FinAI bazo in datoteke. S tem ni zagotovljen neprekinjen promet brez demonstriranega preizkusa.

## 3. Baza in migracije

Po novi odobritvi: ustvariti novo namensko FinAI MariaDB bazo in uporabnika (cPanel lahko doda predpono); `utf8mb4`, primerna združljiva collation, InnoDB; ločen runtime račun z minimalnimi potrebnimi pravicami, migracijske DDL pravice začasno ločeno, če ponudnik omogoča. Brez uporabe obstoječega računa ali baze Laškoteke. Vnesti poverilnice zasebno, ne v terminalski izpis ali repozitorij. Samo sintetični podatki. Pred pomembnimi spremembami narediti ciljno FinAI kopijo baze in datotek ter v izoliranem cilju dokazati obnovo; skupni R1Soft restore lahko vpliva na Laškoteko in ni primeren brez posebnega načrta.

**Kandidata za prvo minimalno sintetično namestitev, po dodatni ciljni preverbi, obnovitvenih vratih in izrecni odobritvi:**
1. `2026_11_01_000001_create_identity_access_tables.php`
2. `2026_11_03_000018_create_user_workspace_preferences.php`

Obe sta bili testirani v CI na SQLite in izolirani MariaDB 10.11; s tem še nista potrjeni za Hiper M ali podatkovno migracijo obstoječega okolja. Dne 6. 11. 2026 je izolirani CI na prazni MariaDB 10.11 uspešno izvedel vseh 18 migracij po časovnem vrstnem redu in ponovil zagon, po popravku ciljne tabele v migraciji 011 in predolgih imen indeksov v 015 in 017. To preverjanje ne potrjuje celovitosti računovodskih pravil, tenant izolacije, obnove, delne odpovedi DDL ali nadgradnje obstoječe baze. Posebej velja: sprememba že obstoječe migracije ne popravi baze, kjer je bila migracija že izvedena; tako bazo je treba obravnavati ločeno z revizijo stanja in namensko korektivno migracijo. Na gostovanju so še naprej kandidata samo 001 in 018, po odobritvi in ciljnih vratih; ne izvajati splošnega `artisan migrate` za ERP. Ne uporabljati `migrate:fresh` na strežniku.

## Posodobitev odvisnosti in prijavnega varovala — 6. 11. 2026

V izoliranem CI je Composer opozoril na nova varnostna obvestila za zaklenjene Symfony pakete. Posodobljen `composer.lock` uporablja združljive varnostne različice; po posodobitvi je `composer audit --locked` uspel. Pregled je časovno občutljiv in ga pred izdajo ponovimo. Funkcionalni test preverja blokado nove prijave v okolju `production` z izključenim `FINAI_AUTH_RELEASE_ENABLED`, za uporabnika brez 2FA in s potrjeno 2FA. Zaradi izolacije tega testa je middleware CSRF izključen; test ne dokazuje CSRF zaščite ali razveljavitve obstoječih sej. Testi na dejanskih domenah in dodatna zaščita dostopa ostajajo obvezni.

## 4. Varnostna in testna vrata pred izdajo

1. Osnovni CI je izvedel `composer validate` in `composer audit --locked`; dodatni izolirani PHP 8.4 + MariaDB 10.11 CI je uspešno izvedel kandidata 001 in 018 ter ponovitev. To ni preizkus celotne aplikacije na MariaDB. Audit je časovno občutljiv in ga je treba ponovno izvesti pred uvedbo. CI, ki je že uspel, ne dokazuje prihodnjega stanja varnosti.
2. Pregled brez skrivnosti celotnega trenutnega drevesa **in zgodovine** z namenskim skenerjem, brez izpisa zaznanih vrednosti. Status ni dokazan zgolj zato, ker `.env` ni med datotekami.
3. Preveriti pravilno razmejitev aplikacij in pravice, zasebni dostop do dokumentov ter preprečevanje IDOR za vsak bodoči endpoint. Pregledati skrivnosti, certifikate in varnost logov tudi zunaj javnega root-a. Ni potrjeno, da aplikacija že ima popoln dokumentni API.
4. Na izolirani first-party domeni preveriti login gate, že obstoječe seje, 2FA vpis/izziv/obnovitvene kode, 401/403, tenant in uporabniško izolacijo, CORS preflight, CSRF 419 in credential cookies; registracija mora ostati onemogočena. Nadzorovati, da zunanji proxy in HTTPS ne povzročita napačnega `Secure` ali napačnega client IP.
5. FinAI na skupnem računu le z izmišljenimi podatki in omejenim dostopom; prijava ne sme biti javno aktivirana. Pred resničnimi strankami obvezno ločen Hiper M račun, nova baza, ciljna obnova, končne domene, celoviti varnostni in funkcionalni testi ter ločeno potrjen preklop.

## Kaj ni bilo izvedeno

Ni sprememb Hiper M, DNS, cPanel, SSL, Laškoteke, baz, migracij, cronov, Vercel domen ali produkcijskega deploya. Rezultati in zgornji načrt ne pomenijo, da je aplikacija pripravljena za dejansko namestitev brez navedenih vrat in nove izrecne odobritve.
