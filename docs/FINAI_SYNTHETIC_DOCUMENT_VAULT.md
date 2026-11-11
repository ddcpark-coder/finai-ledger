# FINAI VAULT-DEV-01 — šifrirana hramba sintetičnih dokumentov (izključno notranja)

Ta sklop pripravi **notranjo storitev**, ne javne funkcije za nalaganje dokumentov ali produkcijske hrambe originalov.

## Tehnični obseg

- Nova tabela `synthetic_documents` obstaja samo v izolirani testni shemi; ni avtomatizirane produkcijske migracije.
- `SyntheticDocumentVault` uporablja Laravelovo overjeno šifriranje aplikacije `Crypt`; v bazi se ne hrani nešifrirana vsebina ali javna pot.
- Izven `APP_ENV=testing/local` se operacija vedno zavrne; tudi tam je privzeta konfiguracijska zastavica `FINAI_SYNTHETIC_VAULT_ENABLED=false`.
- Preveri aktivno, verificirano članstvo v podjetju, največ 64 KiB in obvezno ime `synthetic-*.pdf/png/jpg`; preveri tudi podpis PDF/PNG/JPG. To je **osnovno prepoznavanje**, ne antivirusno skeniranje ali polna MIME validacija.
- Identiteta, `company_id`, SHA256 in čas se beležijo v reviziji. Pred vrnitvijo vsebine se preveri SHA256 in overjeno dešifriranje.
- Ni HTTP kontrolerja, obrazca za nalaganje, API tokena, zunanje integracije ali možnosti uporabe iz javnega FinAI vmesnika.

## Obvezno pred resničnimi dokumenti

Namensko izoliran OS/cPanel račun, ločena DB, lastna zasebna hramba zunaj docroot, dokazljiva enkripcija in upravljanje ključev, antivirus/sandbox, procesiranje brez izvrševanja datotek, preverjanje resnične vrste datoteke, transakcijska povezava metapodatkov/originala, testirana varnostna kopija in obnova, pravila hrambe in izbrisa, politike RS/EU ter revizija na operativnem nivoju.

### Minimalni QA
`php artisan test --filter=SyntheticDocumentVaultTest` v sintetični SQLite okolici. Ni testiranja ali spreminjanja Laškoteke, STNG in skupnega Hiper M računa.
