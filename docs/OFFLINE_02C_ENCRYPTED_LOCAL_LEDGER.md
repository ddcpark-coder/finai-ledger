# FinAI OFFLINE-02C — šifrirana lokalna baza in preizkusni uporabniški dostop

**Status:** razvojna implementacija, obvezno preverjanje Windows CI. **Ni še varna produkcijska računovodska izdaja in ni povezana z uporabniškim vmesnikom.** Vsi podatki so izključno sintetični.

## Kaj je implementirano

1. **Celostno šifriranje nove SQLite datoteke:** `desktop/windows/EncryptedLedgerStore.cs` uporablja javno objavljen in vzdrževan `SQLite3MC.PCLRaw.bundle 2.6.1` (SQLite3 Multiple Ciphers) skupaj z `Microsoft.Data.Sqlite.Core 10.0.0`. Slednji je namesto glavnega `Microsoft.Data.Sqlite`, da ne naložimo dveh konkurenčnih native SQLite ponudnikov. Funkcija `sqlite3mc_version()` mora biti dosegljiva in bralni preizkus mora dokazati, da datoteka ne vsebuje standardne nešifrirane SQLite glave.
2. **Lokalni skrivni ključ:** ob prvem ustvarjanju baze se ustvari 256-bitni naključni ključ, ki se ne shrani v kodi, repozitorij ali navadni datoteki. Ločena datoteka `secure-ledger.key` hrani le ključ, zaščiten z Windows `DPAPI CurrentUser`; `secure-ledger.db` hrani celotno šifrirano bazo. Prijava v drug Windows profil brez prenosa in ponovnega varnega ovitja ključa ni mogoča.
3. **Fail-closed:** brez obeh datotek ali ob nepravilnem ključu se zbirka ne sme samodejno ustvariti ali odpreti kot plaintext. Na istem mestu se ne sme samodejno prepisati stare testne baze. Navadna `journal-sandbox.db` in `drafts.db` ostaneta nespremenjeni. Ne izvajamo migracije starih podatkov.
4. **Lokalna prijava:** lokalni uporabnik ima normalizirano ime in z naključno soljo PBKDF2-HMAC-SHA256 (600.000 ponovitev) shranjen verifier, nikoli gesla. Vloge v `memberships` po podjetju: `admin`, `accountant` in `viewer`; vsako branje in knjiženje zahteva sejo, izdano po uspešni prijavi. `viewer` sme le brati, nesodelujoče podjetje ni dosegljivo. **To ni celovit upravljavec identitet**: manjkajo odjava/zaklepanje, revokacija sej, varni prijavni poskusi, uporabniško upravljanje in sinhronizacija.
5. **Računovodska celovitost (testno):** vložitev uravnoteženih dvojnih knjižb v centih v eni transakciji, konti ločeni po podjetjih, zaščita pred dvojnimi idempotency ključi, zapečatene knjižbe in SQL sprožilci za preprečitev UPDATE/DELETE. Ni še davčnega obračuna, kontnega načrta RS, obračunov DDV ali FURS; pravi poslovni podatki niso dovoljeni.
6. **Revizijska sled:** vezana na `company_id`, `actor_user_id`, datum, tip in knjižbo; HMAC-veriga z ločenim označevalcem domene se preveri ob zahtevi. **To je lokalna integritetna kontrola, ne nepovratna ali zunanje potrjena revizijska sled**: napadalec z dostopom do lokalnega ključa lahko prepiše celoten nabor, zato potrebujemo dodatne nadzorne točke/sinhronizacijo.

## Preizkusni primeri

`EIntegrator.Desktop.exe --encrypted-ledger-self-test` v Windows Actions brez prikaza GUI ali internetne povezave preveri:

- Ustvaritev nove samostojne šifrirane baze, knjiženje 123,45 EUR in po ponovnem zagonu celovitost podatkov.
- Odsotnost začetne glave `SQLite format 3` in sintetičnega označevalca v datoteki.
- Neuspešno prijavo z napačno frazo.
- Uporabnika `accountant` v podjetju A, `viewer` v A, nepooblaščen dostop do podjetja B.
- Zavrnitev neuravnotežene knjižbe, uporabe konta drugega podjetja ter podvojenega idempotency ključa.
- Preverjanje HMAC verige po ponovnem odprtju.
- Zavrnitev odprtja z drugim, sicer veljavnim DPAPI-ovitim ključem.

`.github/workflows/finai-hiperm-desktop-build.yml` mora izpisati `FINAI_OFFLINE_ENCRYPTED_SQLITE3MC_LEDGER=PASS` ter ohraniti PASS starejših preizkusov `--self-test`, `--ledger-self-test` in `--backup-self-test`.

## Varnostne omejitve pred nadaljevanjem

- **Ne povezuj modula s pravimi podjetji ali UI** pred neodvisnim pregledom implementacije, fizičnim Windows QA in preverjeno politiko hrambe.
- Za lokalno računovodsko zbirko **še ni prenosne, potrjene backup/restore rešitve**; OFFLINE-02B backup je izrecno omejen samo na demo osnutke. DPAPI ključ je vezan na lokalnega Windows uporabnika; izguba uporabniškega profila lahko pomeni izgubo ključev in baze. **Resnični finančni podatki so prepovedani**, dokler ni varne obnove po poškodbi računalnika in menjavi profila.
- Enoten SQLCipher native ponudnik ni nameščen; uporabljen je vzdrževan SQLite3MC v privzetem shematskem načinu. Če bomo v prihodnosti menjali cipher/kodo, je potrebna eksplicitna in testirana migracija ter kontrola kompatibilnosti. Pri morebitni produkcijski distribuciji preveri SBOM, licenco MIT, provenance binarnih datotek in znane CVE.
- Lokalna SQLite šifra ne ščiti podatkov, ko so v uporabi pod že odklenjenim Windows profilom. Še manjkajo zaklepanje seje, zaščita pred krajo naprav, varno odjavljanje ter preverjene pravice na datotečnem sistemu.
- `secure-ledger.db` se odpre samo z ekskluzivno lokalno datotečno ključavnico; večprocesna uporaba in konfliktne nadgradnje niso podprte. Trenutni `CreateNew` je na voljo samo testnemu vstopnemu mestu, brez izpostavljenega native bridge.
- Niti CI niti aplikacija ne spreminjata gostovanja Hiper M, DNS, Vercelovega projekta, Laškoteke ali strežniških baz.

## Podlage

- [SQLite3MC – vzdrževani NuGet paketi](https://www.nuget.org/packages/SQLite3MC.PCLRaw.bundle/) in [izvorni projekt](https://github.com/utelle/SQLite3MultipleCiphers-NuGet).
- [SQLitePCLRaw – razlog ukinitve zastarelih brezplačnih cipher paketov](https://github.com/ericsink/SQLitePCL.raw/wiki/SQLite-encryption-options-for-use-with-SQLitePCLRaw).
- [Microsoft: SQLite encryption](https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/encryption).

Povezani nalogi: OFFLINE-02 [#43](https://github.com/ddcpark-coder/finai-ledger/issues/43) in OFFLINE-03 [#44](https://github.com/ddcpark-coder/finai-ledger/issues/44). OFFLINE-02 ostane odprta do celovite varne obnove, poslovnega modela, DDV pravil in uporabniških preizkusov.
