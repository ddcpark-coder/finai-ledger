# FinAI NEXT11B — poslovne enote, skladišča in priprava povezav s trgovinami

## Zaključene funkcije demonstracijske aplikacije

1. Pregled poslovnih enot in pripadajočih skladišč. Izbor skladišč in artikla omogoča prenos ene testne enote. Razpoložljiva zaloga, rezervacije in fizično stanje se vedno preverijo na podjetje, zneski se ne spreminjajo.
2. Podjetje 1 ima dve poslovni enoti in tri testna skladišča; podjetji 2 in 3 imata povsem ločena sintetična skladišča. Ni dejanskih skladišč ali poslovnih podatkov.
3. Prenosi so verzionirani, preprečujejo negativno zalogo in podvajanje dogodkov. Testni dnevnik ne spreminja prave baze.
4. Nova navigacija Integracije ponuja testno pripravo naročil WooCommerce in Shopify. Vhodni sintetični dogodek preveri ponudnika, podjetje, izvorno skladišče, SKU, EUR, količine, cene in skupni znesek.
5. Testno naročilo se shrani **samo v RAM spletnega pogleda**, v statusu review, brez realnega računa, knjiženja, davčne potrditve, znižanja zaloge ali dostopa do spletne trgovine.

## Kaj NI izvedeno

- Prave povezave WooCommerce / Shopify, webhook podpisi, API skrivnosti, OAuth, razporejevalnik, prenos realnih naročil, sinhronizacija ali prodajno knjiženje.
- Trajna podatkovna baza poslovnih enot ali migracija v MariaDB.
- Prava Windows/mobilna poslovna sinhronizacija in podpora realnim poslovnim enotam.

Priprava za vmesnik API ostaja varno izoliran model pogodbe in sintetična pregledna vrsta, ne aktiven konektor. Prave povezave se lahko aktivirajo šele po izolaciji FinAI, end-to-end QA in upravljanju skrivnosti izven repozitorija.

## Preverjanje

- node --test tests/next11Operations.test.mjs tests/contextRoute.test.mjs
- Obstoječa spletna gradnja in povezani testi v GitHub Actions.
- Noben strežniški zapis na Hiper M in noben poseg v Laškoteko ali STNG.
