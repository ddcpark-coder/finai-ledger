# FinAI NEXT-04 — ročni uvoz šifrirane mobilne sintetične vrste v Windows

**Status:** razvojna demonstracija, samo sintetična podjetja in dokumenti. To ni dejanska dvosmerna sinhronizacija.

## Postopek

1. V mobilnem /field/ po izdelavi sintetičnega dokazila s testnim geslom izberi »Shrani šifrirano« in »Uvrsti šifriran demo v vrsto«.
2. Izberi »Izvozi šifrirano vrsto«. Nastane JSON z AES-GCM ovojnico, ki vsebuje ciphertext, sol in IV, ne pa gesla ali nešifriranega podpisa.
3. V Windows aplikaciji odpri /offline/, izberi *isto* sintetično podjetje in klikni »Uvozi šifrirano mobilno vrsto (JSON)«. Izbor datoteke poteka prek izvornega Windows pogovornega okna, ne JavaScript brskalniškega mostu.
4. Namizna aplikacija strogo preveri format, podjetje/dokument, UUID, status, verzije ter strukturo šifrirane ovojnice. Sprejeti izvirni JSON se dodatno zaščiti z **Windows DPAPI CurrentUser** v namenski SQLite `synthetic-mobile-import.db`.
5. Enak dogodek je mogoče ponovno uvoziti brez podvajanja. Spremenjen ali drugi dogodek za isto podjetje se ne prepiše. Ročno odstranjevanje izbriše zgolj uvoženo Windows kopijo, ne pa izvirne mobilne vrste ali samostojne Windows vrste.
6. Videz v Windows prikazuje samo neobčutljive metapodatke. Uvoza ni mogoče uporabljati za račune, knjižbe, PDF podpisovanje ali omrežno pošiljanje.

**Omejitev:** Windows ne pozna testnega mobilnega gesla in ne dešifrira niti kriptografsko ne potrdi izvirnega mobilnega dogodka. Preverjanje strukture in Windows DPAPI *ne dokazujeta* pristnosti mobilnega podpisa. Uvoz ne sproži avtomatskega prenosa ali računovodskih sprememb.

## Testiranje

`EIntegrator.Desktop.exe --mobile-import-self-test` preverja ponovni zagon SQLite/DPAPI, primerjavo hash izvirnika, idempotenten ponovni uvoz, zavrnitev tujih podjetij, prepoved prepisovanja in odsotnost nešifriranega dokumenta v lokalnem DB. Windows GitHub Actions to izvrši ob spremembah Windows kode.

## Varnostna in infrastrukturna meja

Brez resničnih podatkov, ključev, povezave z bančnimi/FURS storitvami ali produkcijskega prenosa. Ni sprememb Hiper M, cPanel, SSH, Laškoteke ali STNG. Pred javno sinhronizacijo FinAI potrebuje lasten OS račun, TLS, končno identiteto uporabnika/naprave, izolacijo podjetij, preverjeno obnovo, podpisno arhitekturo ter računovodski QA.
