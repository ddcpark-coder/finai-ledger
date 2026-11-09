# OFFLINE-02D — celotna šifrirana lokalna baza: prenosna obnova in začasne seje

**Status:** razvojni test, brez realnih finančnih ali osebnih podatkov. Projektni dostop strogo omejen na FinAI. **Laškoteke v nobeni obliki ni dovoljeno spreminjati.**

## Izvedeno

- `PortableEncryptedLedgerBackup.cs` omogoča lokalni izvoz celotnega že **šifriranega** SQLite3MC datotečnega posnetka skupaj s 256-bitnim ključem, ki je znotraj ločene AES-256-GCM zaščitene prenosne kopije. Koda ne zamenjuje, spreminja ali kopira stare demo zbirke.
- Prenosna datoteka `FNAILED2` ima različico 1, naključno sol, nonce, PBKDF2-HMAC-SHA256 (600.000 ponovitev) in AES-256-GCM s šifrirano vsebino in avtenticirano glavo. Ni vmesnega nezavarovanega SQLite, keyfile ali recovery gesla na disku.
- Izvoz sprejme le nove ciljne datoteke; ne prepisuje obstoječih kopij; velikost baze je omejena na 64 MiB za testno fazo.
- Obnovitev najprej kriptografsko preveri celoten arhiv; v novi staging mapi v istem datotečnem sistemu shrani šifriran SQLite posnetek in znova ovije ključ s **Windows DPAPI CurrentUser** na ciljnem Windows profilu. Zbirka mora prestati SQLite `quick_check`, `foreign_key_check` in verifikacijo lokalne HMAC revizijske verige. Šele potem se celotna mapa preimenuje v doslej neobstoječi ciljni direktorij.
- Prepovedano je prepisovanje obstoječih baz ali mešanje zapisov. Staro in novo računovodsko jedro za zdaj ostajata ločena.
- Lokalna testna `Session` dobi časovno omejeno veljavnost 15 minut in možnost preklica `Revoke`; vse operacije s pravicami preverjajo aktivno sejo.

## Test

`EIntegrator.Desktop.exe --ledger-recovery-self-test` ustvari **sintetično** šifrirano bazo, dva konta in uravnoteženo knjižbo, naredi šifrirano kopijo, jo obnovi v nov direktorij in preveri prijavo/knjižbo ter celovitost revizijske sledi. Zavrniti mora napačno frazo, poškodovano glavo, spremenjen šifrat, skrajšano datoteko, prepis obstoječega backup/restore cilja in preklicano sejo. Windows CI mora izpisati `FINAI_OFFLINE_LEDGER_RECOVERY=PASS` ter ohraniti stare preizkuse.

## Preostale produkcijske blokade

- Test na dejanskem drugem Windows uporabniku/računalniku, neodvisni varnostni pregled, obravnava časovnih omejitev sej, hitrost PBKDF2, pravilno ravnanje z gesli v procesu, omejitev prijavnih poskusov in preveritev ACL lokalne baze.
- Backup/restore mora podpirati večji obseg, verzioniranje in varno migracijo sheme; testirati je treba obnovitev po izpadu napajanja ter prekinjeno kopijo na drugih datotečnih sistemih.
- Dvostavno knjiženje še ni v popolnem uporabniškem vmesniku; ni pripravljena slovenska DDV/FURS logika ali konformančni scenariji z Laravelom.
- Zato OFFLINE-02 #43 in OFFLINE-02D #51 ostajata odprti, čeprav je osnovna tehnična podfaza implementirana.

Podobno kot pri STNG se pripravljajo varovane avtomatske izdaje, vendar **izključno v ločenem FinAI gostovalnem računu**. Podrobnosti: `docs/FINAI_AUTOMATION_ISOLATED_HOSTING.md`. Obstoječi uporabnik `laskot48` in Laškoteka se ne spreminjata.
