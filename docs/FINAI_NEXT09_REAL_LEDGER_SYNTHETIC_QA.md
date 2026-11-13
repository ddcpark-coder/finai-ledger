# FINAI NEXT-09 — preverjanje dejanskih knjižilnih razredov na sintetičnih podatkih

Obstoječa Laravel razreda `PostJournal` in `ReverseJournal` sta zaščitena z `LedgerPostingGuard`. To nista nova javna API-ja. Knjiženje uporablja **obstoječe računovodske tabele**, toda preverjanje poteka *izključno v izolirani SQLite :memory: testni bazi* z izmišljenimi podjetji in postavkami.

## Zaščite in preverjanja

- Tudi neposreden klic aplikacijske storitve zahteva aktivnega uporabnika, potrjen e-naslov, aktivno članstvo in pravico `ledger.post` v izbranem podjetju.
- Dnevnik, poslovno leto, računovodsko obdobje ter vsi konti, stroškovna mesta in davčne oznake morajo pripadati istemu podjetju.
- Dovoljeni so samo aktivni, knjižljivi konti, odprto leto in odprto obdobje ter datum knjiženja znotraj obdobja.
- Dvostavno knjigovodstvo uporablja zneske z največ dvema decimalkama, preverja debet = kredit in najmanj dve postavki.
- Storno je zrcalna dvostavna knjižba samo predhodno knjiženega izvirnika, brez podvajanja storna in brez spreminjanja zalog. Potrebuje novo številko in veljaven datum v odprtem obdobju.
- Knjižba, status in revizijska sled so v eni DB transakciji; ob napaki audit zapisa se celoten poskus povrne.

## Kontrole

`RealJournalPostingSyntheticTest` migrira pravo osnovno shemo glavne knjige *samo v testni pomnilniški DB*. Preverja pravilen debet/kredit, storno, 2 podjetji, napake računovodskega obdobja, tuje konte, neodobrene uporabnike, nepravilno stanje, rollback in revizijsko sled.

To **ni potrditev zakonitosti davčnega evidentiranja, produkcijske glavne knjige ali vseh robnih primerov**. Zlasti ostajajo potrebni preizkusi računovodskih obdobij, DDV, odprtih postavk, izvozov, zgodovinskih podatkov, obnov in konkurenčnih transakcij pod dejansko podatkovno bazo MariaDB. Brez produkcijskih migracij, dostopa ali posega v Laškoteko/STNG.
