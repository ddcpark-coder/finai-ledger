# FinAI NEXT-13B — šifrirani offline osnutki naročil v Windows

**Razvojni demonstrator, samo sintetični podatki.** Ta faza ne odpre HTTP poti, ne knjiži računov in ne spreminja produkcijskih baz.

## Implementacija

- `EncryptedSyntheticOrderDrafts.cs`: razširitev obstoječe SQLite3MC `EncryptedLedgerStore`, brez uporabe nešifrirane sekundarne zbirke.
- Na starejših obstoječih zbirnikih s shemo v1 je tabela `synthetic_order_drafts` dodana šele ob **izrecnem** vpisu z aktivno lokalno sejo in vlogo, ki dovoljuje pisanje. Odpiranje stare baze samo po sebi ne sproži migracije.
- Vpisani so samo izmišljeni SKU `SYN-*`, količina, celoštevilska cena v centih, UUID, podjetje, avtor in čas. Imena strank, davčne številke, računi, poverilnice in omrežni podatki niso dovoljeni.
- Zapisi so append-only (SQL sprožilca zavrneta UPDATE/DELETE); idempotentni ključ zavrne spremenjen ponovni vpis, nespremenjeno ponovitev pa vrne kot isti zapis.
- Vsak zapis ima domensko ločen HMAC, povezan s ključem šifrirane zbirke. Ob branju in pred šifrirano obnovitvijo se integriteta preveri; običajna HMAC revizijska veriga je dopolnjena v isti transakciji.
- Izvoz in obnova uporabljata obstoječi `PortableEncryptedLedgerBackup`, AES-GCM zaščito izvoza z geslom in DPAPI previtje ključa ob obnovi na drugem Windows računu.
- Šifrirani zapisi se ne pošiljajo v oblak. `MainWindow` nima avtomatičnega mostu do nove native storitve, dokler prijava in tenant identiteta nista pravilno povezani.

## Minimalni QA

`dotnet publish desktop/windows/EIntegrator.Desktop.csproj -c Release -r win-x64 --self-contained true`

`EIntegrator.Desktop.exe --synthetic-order-draft-self-test`

Test ustvarja samo začasni sintetični uporabniški profil na Windows CI: dve podjetji, writer/viewer, zavrnjena tuj podjetje in napačni SKU, idempotentnost, ponovni zagon zbirke, šifrirana prenosna kopija/obnova, SHA/MAC preverba in odsotnost vidnega sintetičnega SKU v surovih datotekah. Predhodni Windows smoke test ostane v istem CI.

**Ni potrjeno:** produkcijsko računovodstvo, realni uporabniki, varna namestitev/posodobitev programa, sinhronizacija z mobilno aplikacijo, prenosna obnova v vseh OS profilih in ureditev elektronskih podpisov. Varnostna revizija je obvezna pred resničnimi podatki.

Na skupnem Hiper M `laskot48` ni nobenega pisanja. Laškoteka, STNG in skupne konfiguracije ostanejo popolnoma nedotaknjene.