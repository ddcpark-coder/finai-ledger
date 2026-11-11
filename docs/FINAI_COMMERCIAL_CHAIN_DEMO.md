# FINAI COMMERCIAL-CHAIN-DEMO-01 — voden večmodulni tok

**Prva uporabna demonstracijska povezava poslovnih postopkov** v FinAI:

1. **Ponudbe** — ustvari sintetično ponudbo in izrecno potrdi pripravo.
2. **Naročila** — izrecno potrdi sprejem ponudbe in ustvari demonstracijsko naročilo.
3. **Dokumenti/dobavnice** — potrdi sintetično dobavnico.
4. **Izdani računi** — označi demonstracijsko pripravo računa.

Vmesnik vodi uporabnika med moduli, prikazuje status in naslednji korak ter prepreči preskok stopnje. Vsi zneski so v celih centih. Podatki so ločeni po podjetju in shranjeni zgolj v `sessionStorage` trenutnega zavihka kot rekonstruiran seznam dovoljenih sintetičnih dogodkov. Pri neveljavnem zaporedju ali tuji identiteti podjetja se zapis zavrne.

**To ni produkcijska transakcija.** Koraki ne ustvarijo pravih ponudb, naročil, dobavnic, skladiščnih rezervacij, računov, PDF/XML, terjatev ali knjižb. Nobeno sporočilo se ne pošlje in nobena eDavki/FURS operacija ne nastane. Obstoječi modulni demonstracijski seznami ostajajo ločeni; voden tok je samostojno učni primer.

**Minimalni QA:** `node --test tests/demoCommercialFlow.test.mjs` in en namizni/mobilni Playwright scenarij prehoda skozi štiri module, preverjanje obveznih potrditev, osvežitve ter izolacije podjetij. Brez strežniških zapisov na Hiper M, v Laškoteko ali STNG.

**Naslednja strokovna faza:** po potrditvi celovitega računovodskega modela združiti proces v namensko transakcijsko bazo z atomarnimi številkami dokumentov, DDV pravili, verzioniranjem, podjetniškimi pravicami, revizijo, vodenim podpisom, rezervacijo zalog in pravilno elektronsko pošto; vse z ločeno izolirano FinAI namestitvijo.
