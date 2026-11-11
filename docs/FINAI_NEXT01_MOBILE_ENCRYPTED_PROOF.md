# FINAI NEXT-01 — mobilna šifrirana testna hramba podpisanih dokazil

Na zaslonu **Dokumenti → Dobavnice → Za podpis** je po preverjenem lokalnem podpisu omogočeno:

- Vnos **lokalnega gesla (najmanj 12 znakov)**, ki ga program ne hrani, ne pošilja in se po operaciji počisti iz vnosnega polja.
- Šifriranje **samo sintetičnega** dokaznega zapisa s PBKDF2-HMAC-SHA256 (250.000 iteracij, naključna 16-B sol) in AES-256-GCM (12-B nonce, dodatno avtenticirani podjetje + dokument).
- V IndexedDB se shrani samo šifriran dokazni paket in minimalna sintetična ID-ja. Nešifriran podpis in dokument se ne shranita. Vsako podjetje ima svoj ključ zapisa; drugega ni mogoče obnoviti pod napačnim ID-jem.
- Ponovna otvoritev zavihka: uporabnik lahko vpiše enako geslo in dešifrira paket; pred uporabo sistem ponovno preveri veljavnost celotnega SHA-256 dokazila in pripadnost podjetju. Brisanje je izrecno ročno.
- Brez interneta deluje **šifriranje že naložene aplikacije**, toda samostojen/offline **zagon PWA** še ni zagotovljen; za to potrebujemo preverjen cache aplikacijskih datotek, pravila za nadgradnjo in obnovitev ter pravo prijavo.

## Kaj ta del NI

- Ni primeren za resnične poslovne ali osebne podatke, nima podprte sinhronizacije, varnostne kopije niti strežniške revizije.
- Ni kvalificiran e-podpis, podpisan PDF/PAdES ali pravno preverjen dokaz o identiteti.
- Lokalno geslo NI prijava v FinAI; uporabnik si ga mora zapomniti. Pozabljeno geslo pomeni izgubljen dostop do te lokalne demonstracijske kopije.
- Brskalniška hramba se lahko izbriše zaradi čiščenja podatkov ali omejitev naprave; ne nadomešča produkcijske hrambe.

## Minimalni test
`node --test tests/demoDeliveryProof.test.mjs tests/demoDeliveryPdf.test.mjs tests/mobileProofVault.test.mjs` + ena namizna/mobilna Playwright simulacija: podpis, shranitev z geslom, osvežitev strani, ponovna overjena obnova, menjava podjetja in preverjanje, da ni strežniških pisalnih zahtevkov.

Vsa opravila so samo v razvojnem FinAI repozitoriju. Laškoteka, STNG in skupni Hiper M ostanejo nedotaknjeni.
