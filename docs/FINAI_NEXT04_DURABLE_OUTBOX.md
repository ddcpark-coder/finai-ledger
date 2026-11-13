# FINAI NEXT-04 — trajna šifrirana čakalna vrsta za mobilni demo

## Meje
Razvoj, samo sintetične dobavnice in fiksna demo podjetja (1–3). Nikoli resnične pogodbe, računi, podatki, podpisi ali ključi. Lokalna IndexedDB hrani le že AES-GCM šifrirane ovojnice. Gesla, čisti podpisi in PDF niso v čakalni vrsti. Javna spletna izdaja nikoli nima aktivnega API prenosa.

## Način delovanja
1. Zaključi sintetično dobavnico in z geslom shrani šifrirano lokalno kopijo.
2. »Uvrsti šifriran demo v vrsto« brez omrežja ustvari trajen zapis z UUID, pričakovano verzijo in šifrirano ovojnico. Več podjetij ima ločene ključe. Brisanje/osvežitev strani ne spremeni UUID.
3. »Ročno pošlji šifriran demo« je na voljo le v namenskem localhost testu in uporabniku z aktivno sejo/CSRF. Sproži POST z *istim* UUID brez predhodnega GET, saj lahko strežnik pri izgubljenem odgovoru idempotentno potrdi prejšnji sprejem.
4. Ob 409 se izvede le GET preverjanje strežniške verzije; zahtevek se označi kot konflikt in ostane šifriran lokalno, ponoven POST pa je blokiran. Pri omrežnih napakah ali 401/403 stanje ostane queued za kasnejšo *ročno* ponovitev.
5. Potrditev uspešnega POST-a je preverjena (podjetje, dokument, pričakovana verzija, sintetični indikatorji). Stanje acknowledged ostane shranjeno, dokler uporabnik izrecno ne odstrani dogodka.
6. »Izvozi šifrirano vrsto« prenese sintetični JSON šifrirane ovojnice za pregled. »Odstrani iz vrste« potrebuje potrditev in ne izbriše ločene lokalne šifrirane kopije. Ob aktivnem dogodku je zamenjava/brisanje lokalne kopije zadržana.
7. Ne uvajaj samodejnega pošiljanja v ozadju, ponovnega knjiženja, mešanja najemnikov ali resničnih podpisnih trditev.

## Minimalni QA
`node --test tests/demoReceiptOutbox.test.mjs`; `node --test tests/syntheticSyncClient.test.mjs`; `npx playwright test tests/e2e/field-outbox.spec.cjs` in obstoječa mobilna/offline ter PDF smoke testa. CI spremembe so omejene na FinAI.

## Windows in nadaljnja integracija
Windows offline vrsta ostaja ločeno lokalno šifrirano skladišče (DPAPI/SQLite); samodejna Windows↔mobilna sinhronizacija **ni implementirana**. Naslednji razvojni korak je preverjen in ekspliciten izvoz/uvoz sintetičnega dogodka po enotni shemi, z medpodjetniško izolacijo in brez sinhronizacije proizvodnih računov.

## Gostovanje
Na skupnem sistemskem uporabniku `laskot48` ni strežniških zapisov. Pred javno produkcijo je nujen ločen FinAI OS/cPanel račun, namenska DB, TLS, obnovitev, varnostni in računovodski QA. Laškoteka in STNG se ne smeta spreminjati ali uporabljati za teste.
