# FinAI – projektna pravila, različica C (namenski cPanel, 23. 11. 2026)

**Status:** priporočena aktualna operativna pravila za kopiranje v **ChatGPT Project → Instructions**. Posodobitev te datoteke v GitHubu **ne spremeni** nastavitev ChatGPT Project ali dovoljenj na strežniku. Različica B z začasnim skupnim računom ni več veljavna kot *aktualno ciljno okolje*.

## 1. Obseg

Vse razvojne in operativne naloge veljajo **izključno** za FinAI / e-integrator.si in repozitorij `ddcpark-coder/finai-ledger`. Vsi drugi projekti in njihove datoteke, storitve, baze, cPanel računi, ključi, DNS, SSL, varnostne kopije in podatki so **nedotakljivi**. Izrecno velja prepoved vsake spremembe Laškoteke, STNG in starega skupnega računa `laskot48`. Uporabnik z zahtevo za FinAI ne odobri čiščenja starega računa. Noben FinAI agent ne sme pisati v `/home/laskot48/public_html` ali drugo pot starega računa.

To varnostno pravilo ostane v projektnih navodilih, vendar ga **ni treba ponavljati v vsakem običajnem odgovoru, PR-ju ali poročilu**. Navedi ga le pri strežniških operacijah, migracijah ali dejanski nevarnosti medprojektnega posega.

## 2. Trenutno razvojno okolje

FinAI ima že **namenski cPanel/OS račun `einteg86` (UID 1256, `/home/einteg86`)**. Za aplikacijo je predviden `app.e-integrator.si`, za Laravel API `api.e-integrator.si`, za osnovno stran `e-integrator.si`. Njihove dejanske dokumentne korene je treba preveriti ob vsaki namestitvi; zgodovinsko potrjeni imeniki so `/home/einteg86/app.e-integrator.si`, `/home/einteg86/api.e-integrator.si` in `/home/einteg86/public_html`. Novo računovodsko okolje se ne deli s starim cPanel sistemskim uporabnikom.

**Ustvarjen račun ni samodejno dokaz popolne izolacije, delujočega API-ja, aktivne aktualne izdaje, namenske MariaDB ali preverjene povrnitve.** Te predpogoje preverimo ciljno pred pisalnimi strežniškimi operacijami, ne pa pri vsaki običajni GitHub razvojni nalogi.

## 3. Pospešen samostojen razvoj

Ukazi »izvedi« in »nadaljuj« dovoljujejo običajno samostojno delo **znotraj FinAI**: pripravo/spreminjanje kode, GitHub vej, PR-jev in CI, najmanjše potrebne teste, pregled in združitev uspešno preverjenih sprememb. Smiselno združuj povezane korake, ne ponavljaj že zaključenih testov. Ob blokiranem strežniškem opravilu nadaljuj vse druge dovoljene naloge.

## 4. Spletna namestitev in zaščiteni predogledi

Cilj spletne aplikacije je **namenski Hiper M cPanel `einteg86`**. Vercel je lahko samo zaščiten razvojni predogled s sintetičnimi podatki; javne domene FinAI ne usmerjamo na Vercel. Nikoli ne sklepaj, da uspešna GitHub gradnja pomeni opravljeno namestitev. Javna aplikacija mora prikazovati dejanski preverjen SHA izdaje.

Prva strežniška objava zahteva ciljno preverjanje izolacije OS/ACL, identitete, resničnih poti in symlinkov, lastništva, webserver/docroot ujemanja, namenskega SSH ukaznega prehoda, namenske baze, HTTPS, kontrolnega SHA256, obnove ter minimalnih ciljnih testov. Prvi preklop je ročno varovan; poznejša samodejna sintetična izdaja je mogoča šele ob izrecno omogočenih in dokazano izpolnjenih varovalkah, atomarnem preklopu, smoke testu in rollbacku.

## 5. Namenski dostopi in skrivnosti

Uporabljaj samo namenjene FinAI Ed25519/SSH identitete z dovoljenimi ukazi, pripetim ključem strežnika in najmanjšimi potrebnimi pravicami. Ni splošnega SSH ali prenašanja starih ključev. Gesla, zasebni ključi, `.env`, podatki strank in dostopni žetoni ne sodijo v klepet, izvorno kodo ali dnevnike. Za Laravel pripravi ločeno FinAI bazo in uporabnika s privilegiji samo za to bazo; migracije le v preverjenem FinAI okolju.

## 6. Funkcionalnosti in platforme

Razvijaj povezan ERP/računovodski sistem: računovodstvo in DDV, dokumente, CRM 360, ponudbe, naročila, skladišča, več poslovnih enot, poslovno analitiko, integracije in mobilni podpis. Različne platforme naj uporabljajo usklajene podatkovne pogodbe in izolacijo podjetij.

Windows aplikacija mora biti **samostojna in namestljiva brez internetne povezave**, s šifrirano lokalno bazo, revizijsko sledjo in preverljivo prenosno obnovo. Mobilno sinhronizacijo omogoči šele po preverjenih napravah, identitetah, pooblastilih, konfliktih in obnovi.

## 7. Zakonitost in podatkovna varnost

Do zaključenega varnostnega in računovodskega QA uporabljaj samo **sintetične podatke**. Za resnične podatke so obvezni: avtorizacija in MFA glede na tveganje, šifriranje, izolacija podjetij, revizijska sled, test obnove, pravilnost knjiženja, davčna logika in skladnost RS/EU/FURS. Demonstracijskih funkcij nikoli ne označi kot dejansko knjiženje, davčno potrjevanje ali pošiljanje.

## 8. Minimalni testi in jasno poročanje

Testiraj spremenjene funkcije in njihove kritične odvisnosti; prej opravljena preverjanja uporabljaj ponovno. V kratkem poročilu loči: (a) izdelano kodo, (b) uspešne teste, (c) združen PR, (d) dejansko nameščeno izdajo in (e) blokade. V običajnem poročilu se osredotoči na napredek FinAI, ne ponavljaj rutinskih stavkov o drugih projektih.

## 9. Podedovana namestitev na starem računu

Račun `laskot48` je za FinAI **read-only** in je samo zgodovinski vir; zanj ni dovoljenega samodejnega deploya, brisanja, spreminjanja ključev, računov, cronov ali konfiguracije. Stari FinAI ostanki so predmet **ločene, izrecno pooblaščene administrativne vzdrževalne naloge izven FinAI Work/CI**, po preverjeno uspešni novi namestitvi, zanesljivi obnovi, popisu dejanskega lastništva in odvisnosti ter dovolj dolgem opazovalnem obdobju. Glej `docs/FINAI_LEGACY_CLEANUP_HANDOFF.md`. Samo ime mape `finai` ni dokaz, da je celoten njen položaj varen za brisanje.

## Uvodna vrstica za nove Work naloge

> Delo velja IZKLJUČNO za FinAI / e-integrator.si na namenskem računu `einteg86` in v repozitoriju `ddcpark-coder/finai-ledger`. Razvijaj samostojno, smiselno združuj naloge in izvajaj le nujne sintetične teste. Strežniško pisanje in objavo dovoli samo po preverjanju izolacije, ciljev, SHA256 in povrnitve; stari skupni račun ostaja read-only, drugi projekti so izven obsega. Ob blokadi nadaljuj vse druge varne naloge in poročaj o dejanskih rezultatih.

## Veljavnost

To je repozitorijska kopija pravil. Nastavitve **ChatGPT Project → Instructions** je treba posodobiti posebej. Nobeno pravilo samo po sebi ne izvede strežniške selitve, ne potrdi dejanskega SSH/ACL stanja, ne izbriše starih datotek in ne spremeni produkcijskega načina aplikacije.
