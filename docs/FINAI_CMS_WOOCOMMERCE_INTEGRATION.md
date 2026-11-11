# FINAI CMS-ORDER-DEMO-01 — osnova za povezavo CMS / spletnih trgovin

To je **demonstracijska** integracija, ne povezava z resničnim WooCommerce ali STNG. V modulu **Naročila** lahko uporabnik v trenutnem podjetju z enim gumbom uvozi dva sintetična WooCommerce podobna naročila.

## Izvedeno
- Adapter validira izrecno oznako `demo_only=true`, identiteto izbranega podjetja, trgovine in zunanjega naročila, EUR, podprte statuse, količine, vse postavke ter neto + DDV vsoto v centih. Pri neujemanju se naročilo zavrne brez delnega vnosa.
- Enolični ključ: `companyId:woocommerce:shopId:orderId`; ponovljeni identični uvoz ne ustvarja dvojnikov. Spremenjeno že uvoženo naročilo zahteva ročni pregled, ne tiho prepisovanje.
- Uvoz je samo v pomnilnik trenutne aplikacije. Ni API ključev, povezav, spletnih zahtevkov, plačil, pošiljanja, sprememb zalog ali knjiženja.
- Naročila in CMS prikaz se ločujejo po podjetjih; ponastavitev vpliva samo na trenutno podjetje.

## Za pravo CMS integracijo
1. Ločene povezave in skrivnosti po podjetju/trgovini, hranjene v šifrirani konfiguraciji izoliranega FinAI strežnika.
2. `POST /webhooks/woocommerce/{connectionId}` samo na varovanem HTTPS z obvezno preverbo HMAC SHA-256 nad **surovim telesom** in preverbo izvora, velikosti, timestampa in morebitne ponovitve. Webhook ni pooblaščen za pisanje v druga podjetja.
3. Idempotenten inkrementalni uvoz in outbox dogodki; statusi `received → validated → requires_review → approved`. Človek potrdi konfliktnost, odstopanja plačil in davčnih pravil.
4. Naročila se povežejo s partnerji in katalogom prek podjetniških ID-jev; ustvarjanje računa, rezervacija zalog in e-pošta ostanejo ločeni, revizirani koraki.
5. Ločeni testni certifikati/sintetična okolja, varnostni pregled dostopa, revizija, obnova in pravna/podatkovna skladnost.

**Omejitve:** brez resničnih podatkov, brez dostopa do tujih CMS, Laškoteke ali STNG, brez strežniških pisalnih posegov na skupnem računu. Ta sklop ne oglašuje pravega dvosmernega povezovanja.
