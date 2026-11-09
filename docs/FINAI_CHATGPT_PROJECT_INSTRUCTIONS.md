# FinAI – projektna pravila, različica B (potrjeno 9. 11. 2026)

**Status: uporabnik potrdil in shranil v ChatGPT Project (9. 11. 2026).** GitHub kopija je referenčna; ne spreminja nastavitev ChatGPT Project ali strežniških pravic. Najstrožja prepoved poseganja v Laškoteko ostaja.

1. **ABSOLUTNA PREPOVED SPREMEMB LAŠKOTEKE.** V nobenem FinAI klepetu, ChatGPT Work, Codex, CI/CD, SSH ali cPanel postopku ni dovoljeno neposredno ali posredno spremeniti `laskoteka.si`, `www.laskoteka.si`, `/home/laskot48/public_html`, njene kode, datotek, podatkov, uporabnikov, storitev, DNS, SSL, SSH ključev, `authorized_keys`, cron, konfiguracije ali varnostnih kopij. Prepoved vključuje vplive prek skupnih servisov.
2. **STNG in drugi projekti so nedotakljivi.** Pisanje z nalogo FinAI je dovoljeno izključno v preverjenem FinAI repozitoriju oziroma kasneje ločenem gostovalnem okolju.
3. **Začasni razvojni režim B:** do javne produkcije ostane FinAI na istem paketu oziroma fizičnem gostovanju Hiper M, kjer so druge aplikacije. Več domen in ločeni document root direktoriji so dovoljeni; skupni cPanel/OS račun `laskot48` je za avtomatizacije FinAI **izključno read-only**. Režim B sam po sebi ne pomeni dovoljenja za pisanje na ta račun.
4. **Tehnična izolacija pisanja:** pred kakršnimkoli strežniškim zapisom mora ponudnik potrditi dejansko neodvisno učinkovito sistemsko identiteto/lastništvo in pravice, ki FinAI ne omogočajo spreminjati drugih projektov. Isti Unix UID `laskot48`, ločene mape, `chmod 700`, ločena MariaDB baza in SSH forced-command brez OS izolacije niso zadosten dokaz.
5. **SSH pravice:** obstoječi ključi in `authorized_keys` na `laskot48` ostanejo nespremenjeni. Novi namenski FinAI Ed25519 ključ je dovoljen izključno v preverjenem ločenem sistemskem okolju, z omejenim naborom ukazov, strogim preverjanjem host ključa ter brez poljubnega terminalskega dostopa.
6. **Spletna namestitev:** Hiper M je cilj testne in javne izdaje FinAI; Vercel je lahko zgolj zaščiten pregledni predogled s sintetičnimi podatki. `app.e-integrator.si` se ne usmeri na Vercel.
7. **GitHub razvoj:** »izvedi« pomeni samostojno nadaljevanje v `ddcpark-coder/finai-ledger`: nova veja → najmanjši relevantni testi → pregled rezultatov → PR → združitev. Ob varnostnem blockerju se ustavi samo nedovoljeni strežniški poseg, ne celoten razvoj.
8. **CI/CD:** gradnja statičnega vmesnika, Laravel testov, izoliranih začasnih podatkovnih baz in Windows aplikacije poteka na GitHub-hosted ali lokalno izoliranih izvajalcih. SSH staging/objava se ne omogoči, dokler ni potrjena izolacija iz točke 4.
9. **Preverjanje vsake namestitve:** pred pisanjem preveri natančen OS račun, lastnika, `realpath`, komponentne simbolne povezave, `docroot`, datotečne pravice, ciljno zbirko, različico izdaje SHA256, zadnji PASS test in možnost obnovitve. Ob odstopanju izdajanje zavrni.
10. **Varovana objava:** po dovoljeni izolaciji uporabljaj nespremenljive izdaje, preverjen HTTPS, avtomatiziran smoke QA, rezervno kopijo, atomarni preklop in preverljivo povrnitev. Ni splošnega SSH ključa ali samovoljnega spreminjanja cPanel/OS nastavitev.
11. **Namenska FinAI baza:** ko je omogočena varna izolacija, uporabi samostojno MariaDB bazo, uporabnika z najmanjšimi privilegiji in ločene skrivnosti. Nobenega posega v baze Laškoteke ali STNG; migracije le v FinAI testnem okolju po preverjenem snapshotu.
12. **Windows aplikacija:** samostojna in namestljiva brez internetne povezave ali Hiper M; lokalna šifrirana baza, ločitev podjetij, nespremenljiva revizijska sled ter prenosna preverljiva obnova.
13. **Zaupnost podatkov:** uporabljaj samo sintetične podatke, dokler niso dokazani šifriranje, prijava, varna obnova, izolacija podjetij, slovenska računovodska pravilnost, FURS/RS/EU skladnost in varnostni QA. Gesla, zasebni ključi in podatkovne zbirke ne smejo biti v klepetu, kodi ali dnevnikih.
14. **Pragmatični testi:** izvaja se samo najmanjši relevantni QA za spremenjene funkcije, brez nepotrebnega ponavljanja zgodovinskih preizkusov. Obstoječa produkcija Laškoteke in STNG se nikoli ne uporablja kot testno okolje.
15. **Prehod v javno produkcijo:** FinAI mora pred obravnavo resničnih podatkov dobiti lasten fizično/logično ločen Hiper M OS/cPanel račun, ločene SSH ključe, bazo, obnovitvene kopije, TLS in nadzorovane objave. Začasni režim B tedaj preneha veljati, brez prenosa skupnih ključev ali kakršnihkoli sprememb Laškoteke.

## Obvezna uvodna vrstica za nove Work naloge

»Delo velja IZKLJUČNO za FinAI / e-integrator.si. Spreminjanje Laškoteke v kakršnikoli obliki je strogo prepovedano, prav tako spreminjanje STNG in skupnih cPanel/SSH nastavitev. Med razvojem lahko FinAI uporablja skupno infrastrukturo Hiper M, vendar je račun laskot48 za naloge FinAI izključno read-only. Pisalne objave so mogoče le v neodvisno izoliranem OS okolju. Nadaljuj z dovoljeno implementacijo, minimalnimi testi in GitHub razvojem; ob varnostni blokadi ustavi samo nevarni del in poročaj.«

## Meje veljavnosti

Uporabnik je potrdil, da je pravila posodobil v **ChatGPT Project → Instructions**. Ta GitHub kopija je informativna in usklajena. **Dejansko tehnično izolacijo** je še vedno treba preveriti; projektna navodila ne morejo omejiti SSH procesa z istim `laskot48` UID.
