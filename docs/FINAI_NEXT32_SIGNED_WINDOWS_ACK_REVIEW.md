# FinAI NEXT32 — podpisano strežniško potrdilo in offline Windows pregled

## Varnostni obseg
NEXT32 deluje samo s sintetičnimi podatki v APP_ENV=local/testing. Windows ničesar samodejno ne pošilja na strežnik in ne knjiži. Paket NEXT31 se ročno prenese v izolirani Laravel testni API, podpisani JSON odgovor pa ročno nazaj v Windows.

Strežniška zastavica FINAI_SYNTHETIC_WINDOWS_ACK_ENABLED je privzeto izključena; potrebna je tudi FINAI_SYNTHETIC_RECEIPT_SYNC_ENABLED. Za namenski podpis se lokalno generira zasebni RSA ključ >=2048 bitov in konfigurira njegova pot FINAI_SYNTHETIC_WINDOWS_ACK_PRIVATE_KEY_PATH. Datoteka mora imeti 0600 in biti pod backend/storage/app/finai-next32-signing. Zasebnega ključa nikoli ne dodaj v GitHub, klepet ali javno mapo. Nikoli ne zaganjaj podpisovanja na skupnem Hiper M / laskot48.

## Signed ACK in načelo zaupanja
Strežnik podpisuje samo izvirni UUID, podjetje, dokument, pričakovano in dejansko verzijo, SHA256 dekodiranega AES-GCM paketa, uporabnikov ID, fiksne testne zaščitne vrednosti in prstni odtis javnega ključa. Podpis RSA-SHA256 PKCS#1 v1.5 je izdan šele po preverjenem, podatkovno shranjenem sintetičnem dogodku; podpis in sprejem sta znotraj iste DB transakcije.

Kanonični podpisani niz je UTF-8 z LF za vsako vrstico in končnim LF. Vrstni red:
1. finai-windows-synthetic-ack-v1
2. companyId (decimal)
3. documentId
4. clientEventId
5. expectedVersion (decimal)
6. version (decimal)
7. ciphertextSha256 (lowercase hex)
8. serverUserId (decimal)
9. true
10. false
11. false
12. keyFingerprint (SHA256 SubjectPublicKeyInfo DER, lowercase hex)

Celoten Laravel JSON odgovor vsebuje data.signed_windows_ack. Uporabnik mora pridobiti javni ključ PEM in njegov SHA256 SPKI prstni odtis po neodvisno preverjenem kanalu. Fingerprint iz istega JSON odgovora sam po sebi NI neodvisno zaupanje v strežnik.

## Postopek Windows
1. Ustvari testni dogodek v nativnem FinAI Windows oknu in ga izvozi z ločeno močno lokalno frazo (NEXT31).
2. V lokalnem Laravel testnem okolju ročno pošlji JSON na že obstoječi testni API pod overjeno sejo s CSRF, preverjeno e-pošto, morebitnim MFA in documents.write.
3. Celoten testni HTTP odgovor shrani v .json; javni RSA PEM in njegov SPKI SHA256 preveri po NEODVISNEM kanalu.
4. V Windows izberi Preveri podpisano testno potrdilo, izberi odgovor, PEM, vnesi neodvisno potrjeni fingerprint in izvirno lokalno frazo.
5. Windows preveri podpis, AES-GCM izvozni paket, UUID, podjetje, dokument, verzijo in SHA256 izvirnega šifriranega paketa. Ob neuspehu ne zapiše ničesar.
6. Verificiran ACK se shrani ločeno pod DPAPI CurrentUser v synthetic-signed-ack-review.db. Enaka ponovitev je idempotentna, spremenjena se zavrne. Outbox ostane pending_local; NE pomeni odposlanega ali knjiženega dokumenta.

## Testiranje
Laravel SyntheticReceiptSyncTest uporablja začasni RSA testni ključ in SQLite testno bazo. Windows --signed-ack-self-test preveri veljaven/ponovljen podpis, napačen javni ključ in fingerprint, drugo podjetje/UUID, napačno frazo, prirejeno verzijo ter šifrirano lokalno hrambo. Testira se le spremenjene funkcije z nujnimi povezanimi odvisnostmi.

## Omejitve
Laravel ne dešifrira klientovega AES-GCM dokaza, zato podpis ne dokazuje njegove dejanske vsebine. Ta funkcija NI produkcijska sinhronizacija, podpis eIDAS, certificirana arhivska storitev ali zakonsko preverjeno knjiženje. Pred resničnimi podatki potrebujemo register naprav, preklic ključev, šifrirno infrastrukturo, HTTPS identiteto, avtomatsko zaščiten protokol in računovodski QA.

Striktno prepovedani so kakršnikoli posegi v Laškoteko, STNG, skupni cPanel/SSH, laskot48 in produkcijski Hiper M.