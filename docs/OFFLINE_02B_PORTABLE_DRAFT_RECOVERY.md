# FinAI — OFFLINE-02B: prenosne, šifrirane obnovitvene kopije lokalnih testnih osnutkov

**Status:** razvojni/testni korak. To ni popolna šifrirana baza računovodskih podatkov, produkcijski mehanizem arhiviranja ali javno dostopna funkcija v aplikaciji. Nobeni realni poslovni, finančni ali osebni podatki niso dovoljeni.

## Izvedeno

- `PortableDraftBackup.cs` omogoča prenos testnih osnutkov med mapami/Windows profili brez vezave kopije na izvorni uporabniški DPAPI ključ. Izvoz prebere **vse** potrjene zapise v enem SQLite SELECT posnetku, ne le prvih 100 vrstic demonstracijskega pogleda.
- Osnutki so v izvorni SQLite bazi šifrirani **po posameznem zapisu z Windows DPAPI CurrentUser**. V izvorni bazi lahko ostanejo metapodatki (`id`, `updated_at`) vidni. To **ni celostno šifrirana SQLite baza**.
- Prenosni format `FNAIBK02`/verzija 1 uporablja **PBKDF2-HMAC-SHA256 (600.000 ponovitev, naključna sol 16 B)** za ključ in **AES-256-GCM** z 12 B naključnim nonce, 16 B auth tag in AAD nad celotno nešifrirano glavo. Ne uporablja deprecated SQLCipher NuGet odvisnosti.
- Izvoz ustvarja najprej nov naključen začasen fajl v ciljni mapi, varno izpiše podatke in ga premakne na zahtevano ime **brez prepisovanja že obstoječe kopije**. Po neuspehu se začasni fajl odstrani.
- Uvoz najprej preveri velikost, verzijo, PBKDF2 parametre in AES-GCM celovitost. Nato preveri shemo, UUID identifikatorje, datume, omejitve naslovov/besedila in dvojne identifikatorje. **Šele po popolnem preverjanju** v eni transakciji obnovi zapise in jih znova šifrira z DPAPI trenutnega Windows uporabnika.
- Uvoz je dovoljen **le v prazno testno bazo** in nikoli ne prepiše obstoječih zapisov. Vsa opravila potekajo brez internetne povezave in brez Hiper M.
- Format in algoritmi imajo strogo omejitev največ 1000 osnutkov oziroma 8 MiB nešifriranega payload-a; večje kopije se zavrnejo, ne skrajšajo tiho.

## Preverjanje

Namenski ukaz `EIntegrator.Desktop.exe --backup-self-test` (na CI runnerju, brez dejanskih podatkov) ustvari sintetični testni zapis, dodatnih 102 osnutkov, izvozi varovano kopijo, preveri odsotnost označevalca v jasnem besedilu, obnovi v nov imenik, znova odpre SQLite in preveri **vseh 103** zapisov, čeprav je v navadnem UI vidnih le prvih 100.

Test mora preveriti tudi:

1. Napačno geslo: zavrnitev brez zapisovanja v ciljno zbirko.
2. Poškodovana glava ali šifrirano telo: preverjanje celovitosti spodleti.
3. Skrajšan fajl: zavrnitev pred kakršnimkoli zapisom.
4. Že obstoječa kopija: izvoz ne prepiše datoteke.
5. Že polna lokalna baza: uvoz ne prepiše in ne združi obstoječih zapisov.

CI: `.github/workflows/finai-hiperm-desktop-build.yml` pod `windows-desktop` mora izpisati `FINAI_OFFLINE_DRAFT_BACKUP_RECOVERY=PASS`; sicer PR ostane odprt.

## Varnostne omejitve in naslednji koraki

- **Gesla za obnovo ne shranjujemo** v repozitorij, v rezervno kopijo ali na Hiper M. Uporabnik mora uporabiti močno unikatno frazo, jo varno hraniti in fizično preizkusiti obnovo; izgubljene fraze ni mogoče ponastaviti. Testna koda vsebuje le sintetično testno frazo.
- Osnovna funkcija je **povezana samo z nativnim Windows UI**, prek gumbov **Shrani kopijo** in **Obnovi kopijo**. Izbiro datoteke opravlja Windows Save/Open dialog, obnovitveno geslo pa se vnaša v lastnem nativnem modalnem oknu (ne prek JavaScript/WebView2). Uvoz v neprazno zbirko je zavrnjen, izvoz ne prepisuje obstoječe datoteke. **UI še ni ročno pregledan na fizični napravi Windows 11** in ni primeren za resnične podatke; .NET gesel v pomnilniku ni mogoče zagotovljeno počistiti.
- Ta korak ne vključuje resničnih knjižb `OfflineJournalSandbox`, ki ostaja **nešifriran v izključno začasni testni mapi**. Da bi lahko delali s pravimi podatki, potrebujemo celostno šifrirano in vzdrževano SQLite/SQLCipher ali primerljivo rešitev, meje dovoljenj po podjetjih, audit log, varni restore/rollback in računovodsko usklajene testi s Hiper M.
- Microsoftova dokumentacija pojasnjuje, da osnovni SQLite **ne šifrira datotek** in zahteva modificirano različico (npr. SQLCipher); paketa `SQLitePCLRaw.bundle_e_sqlcipher 2.1.11` ni primerno samodejno vpeljati brez varnostne revizije, ker je na NuGet označen kot **deprecated/no longer maintained**.
- Nadgradnja demonstracijskih podatkov, ki bodo postali resnični, je prepovedana brez revidirane migracije sheme in šifriranja; trenutno še ne omogoči produkcijskih podatkov.
- Niti program za testiranje niti CI ne spreminjata DNS, gostovanja Hiper M, Laškoteke ali podatkovnih baz na strežniku.

Povezani odprti koraki: [OFFLINE-02 #43](https://github.com/ddcpark-coder/finai-ledger/issues/43), [OFFLINE-03 #44](https://github.com/ddcpark-coder/finai-ledger/issues/44), [DESKTOP-02 #45](https://github.com/ddcpark-coder/finai-ledger/issues/45), [HOSTING-02 #46](https://github.com/ddcpark-coder/finai-ledger/issues/46).
