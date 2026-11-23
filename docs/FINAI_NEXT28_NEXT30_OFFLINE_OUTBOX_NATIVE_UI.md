# FinAI NEXT28 + NEXT30 — šifrirana offline vrsta in Windows predpregled

**Status:** samo razvoj s sintetičnimi podatki; brez spletne sinhronizacije ali knjiženja.

## NEXT28 — predpriprava lokalne izhodne vrste

`desktop/windows/SyntheticOfflineSyncOutbox.cs` vodi DPAPI CurrentUser-šifrirane podatke treh fiksnih sintetičnih podjetij v namenski lokalni SQLite zbirki. Vsak dogodek ima globalno enoličen UUID, pričakovano različico ter v šifriranem zapisu fiksen testni dokument. Dvojnik z istim ID in različico vrne obstoječi zapis, poskus spremembe ali uporabe ID v tujem podjetju pa je zavrnjen.

`CompareLocalVersion` dobi izključno **ročno vneseno simulirano** različico, nikoli je ne bere s strežnika. Rezultat je `manual_review` ali `conflict_manual_review`, **niti eno stanje pa ne pomeni potrjene sinhronizacije**. Novo opažanje, ki se razlikuje od prvega, se zavrne in se ne ponovi samodejno. Funkcija ne ustvarja omrežnih zahtev, knjižb, davčnih evidenc ali pravega ACK.

Ciljni CLI `--offline-sync-queue-self-test` preveri ponovno uporabo UUID, večpodjetniško ločevanje, zaznavo konflikta, ponovni zagon, šifriranje lokalnega dokumenta in zavrnitev poškodovanega šifrata.

## NEXT30 — nativni Windows predpregled

V že obstoječem oknu **Šifrirani osnutki** (native WinForms) sta gumba **Pripravi demo konta** in **Preveri demo temeljnico**. Uporabnik se najprej prijavi v obstoječi šifrirani trezor. Program nato pod istim uporabnikom in podjetjem po potrebi idempotentno ustvari le fiksna sintetična konta 1200/2600. Vneseni sintetični znesek v celih centih preveri z `EncryptedLedgerStore.Preview` in rezultat pokaže samo v izvornem Windows oknu.

Ni prenosa lokalnega gesla, uporabniške seje, kontov ali računovodskih podatkov v WebView2. `Preview` ostaja bralna funkcija, vrne `PostingAllowed=false`. Omogočena je samo demonstracijska uporaba; ni povezave s pravim kontnim načrtom, DDV, FURS ali produkcijskim knjiženjem.

## Varnost in nadaljnji razvoj

To še **ni sinhronizacijski protokol**. Potrebni so overjeno strežniško potrdilo, shema, kriptografski podpis, izmenjava šifriranih podatkov, idempotentna oddaljena obdelava, ročna rešitev konfliktov in revizija — vse ločeno preverjeno v FinAI.

Obvezni testi: Windows selftesti sintetične offline vrste, šifrirane glavne knjige, obnove, izvornega vmesnika in osnovne funkcionalnosti. GitHub ustvari izključno nepodpisan notranji QA kandidat. Spremembe ne uporabljajo ali spreminjajo gostovanja, Laškoteke, STNG, skupnega računa `laskot48` ali cPanel/SSH nastavitev.
