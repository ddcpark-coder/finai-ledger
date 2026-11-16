# FinAI NEXT-13H — preverjen in overjen prenos mobilnega šifriranega dogodka v2

**Samo sintetični testni podatki.** To ni produkcijska sinhronizacija, pravno kvalificiran podpis ali dokaz identitete druge naprave.

## Varnostna sprememba

V1 prenosna čakalna vrsta je vsebovala nezaklenjeno SHA-256 vsoto. Ta je dokazovala samo, da datoteka ni bila slučajno poškodovana: posameznik je lahko spremembo `clientEventId` ali `expectedVersion` podpisal z novo nepodpisano vsoto. Novi **v2** zahteva lokalno testno geselno frazo izvornega AES-GCM dokazila in *kriptografsko zaščiti tudi metapodatke prenosa*.

Postopek novega v2 prenosa:

1. Izvoz dopusti samo sintetični dogodek v stanju `queued`, strogo omejeno podjetje, prvotni UUID in pričakovano verzijo.
2. Pred izvozom je treba z lokalno frazo **odpreti in preveriti AES-GCM dokazilo**, povezano z natančnim sintetičnim dokumentom. Sama Base64 vsebina ali SHA-256 nista dovolj.
3. Za prenos se ustvari svež naključni 128-bitni salt in z namensko domeno ločenega PBKDF2-SHA256 (250.000 ponovitev) iz lokalne fraze izpelje 256-bitni HMAC ključ. HMAC-SHA256 zajema **celoten surovi JSON dogodek**, vključno z UUID, verzijo, podjetjem in šifrirano ovojnico.
4. Uvoz preveri strogo shemo `finai-portable-synthetic-outbox-v2`, podjetje, velikost, kodiranje, HMAC, čas, ID ter nato z isto lokalno frazo **dešifrira in preveri AES-GCM dokazilo** še pred lokalno transakcijo.
5. Zaporedje uvoza ne kliče strežnika in ne podvaja dogodkov. Ob drugačnem obstoječem zapisu ostane lokalna baza nespremenjena; uporabnik mora konflikt razrešiti ročno.

## Stara prenosna datoteka

Stara shema `finai-portable-synthetic-outbox-v1` se **namerno zavrne** za uvoz v v2. Prejšnje sintetične dogodke je mogoče z izvorne naprave znova izvoziti kot v2, če uporabnik še ima originalno lokalno frazo in izvirno šifrirano dokazilo. Nikoli ne prepiši dogodka ali povišaj verzije v datoteki.

## QA

- `tests/demoOutboxPortable.test.mjs`: autentikacija celotnega dogodka, veljaven AES-GCM vmesnik, napačna fraza, spremenjen UUID/verzija/ciphertext, tuje podjetje, legacy v1 downgrade, dodatna polja, nepravilna kodiranja in omejitev velikosti.
- `tests/e2e/field-outbox.spec.cjs`: v brskalniku dejansko prenese v2 datoteko, odstrani lokalno vrsto, zavrne uvoz z napačno frazo in ponovno uvozi z isto frazo ter originalnim UUID; brez HTTP pisalnih zahtev.
- Obstoječi `.github/workflows/field-offline-pwa-qa.yml` sproži ciljna Node in Playwright preverjanja ter statično offline PWA gradnjo.

**Ne pomeni:** da je uporabnik avtenticiran na drugi napravi, da je transfer avtenticiran po mreži, da je PWA shramba primerna za realne finance ali da obstaja produkcijski mobilni ključevski register. Za resnične poslovne podatke bodo potrebni namenske naprave, identitete, kriptografski protokol s potekom ključev, revizija in varnostni/računovodski QA.

FinAI GitHub razvoj, brez strežniških pisanj. Laškoteka, STNG, cPanel, SSH in skupni `laskot48` so absolutno nedotaknjeni.