# FINAI NEXT25 — sintetični pregled temeljnice v vmesniku

Spletni modul **Knjiženje → Temeljnice** uporablja obstojeco cisto preverjanje `preflightSyntheticJournal` iz NEXT24. Trivrstični primer v centih je vezan na izbrano podjetje, strogo sintetičen (`SYN-INV-12`, `SYN-ACC-...`), vrne zamrznjen pregled in **nikoli ne dovoljuje knjiženja** (`postingAllowed: false`).

Prejšnji gumb »Knjiži temeljnico« je le preklopil lokalni React status »Knjiženo«, čeprav ni opravil knjiženja. Zdaj gumb **Preveri demo osnutek** dejansko preveri ravnotežje, pravilnost zneskov in vezavo na podjetje. Pogled izrecno označi, da ni nobenega strežniškega zapisa. Sprememba podjetja resetira rezultat in lokalni simulirani zaklep. Nepriklopljeni gumbi za revizijo, dodajanje kontov in stroškovnih mest so onemogočeni in označeni »v pripravi«. Zaklep obdobja in AI ocena sta jasno označena kot simulaciji.

## Meje
- Brez HTTP klicev, migracij, realnih osebnih ali računovodskih podatkov, dejanskega knjiženja in produkcijskih pravnih trditev.
- Brez posegov na Hiper M, cPanel, SSH, Laškoteko ali STNG.
- Prave temeljnice zahtevajo obstoječo Laravelovo avtentikacijo, pravice po podjetju, računovodska obdobja, DB transakcije in revizijo ter ločene strokovne teste.
- Test: `node --test tests/next24SyntheticLedgerPreflight.test.mjs tests/next25SyntheticJournalUi.test.mjs`. CI teče samo za navedene spremenjene datoteke.
