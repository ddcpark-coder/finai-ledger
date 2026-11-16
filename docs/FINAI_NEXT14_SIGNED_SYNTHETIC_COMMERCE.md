# FinAI NEXT-14 — podpisana sintetična trgovinska naročila

**Status:** samo lokalna/testna aplikacijska storitev. Ni javnega webhook endpointa, spletnih povezav, API poverilnic ali resničnih naročil.

## Novi razvojni tok

- `StageVerifiedSyntheticCommerceWebhook` pred sprejemom podatkov preveri Base64 HMAC-SHA256 nad natančnimi surovimi bajti JSON, kot ga za podpis zahteva Shopify oziroma WooCommerce.
- Podpisani JSON vsebuje dodatno izključno sintetično `issuedAt` polje v UTC. Zahteva ±300 sekund preverjanja starosti; to ni dokumentacija resničnega formata spletnih trgovin in ni samostojna produkcijska zaščita pred ponovitvami.
- Podpis se preveri s konstantnočasovno primerjavo, tajni testni ključ se poda samo za klic, brez zapisa v dnevnik ali podatkovno bazo. Stroga omejitev velikosti in nabor zahtevanih polj.
- Če je podpis pravilen in so podatki popolnoma sintetični, obstoječa `CommerceOrderContract` ter `StageSyntheticCommerceOrder` ponovno preverita aktivnega uporabnika podjetja, pravico `orders.write`, pripravljeno povezavo, skladišče, SKU preslikavo, podvojitve, numeriko v centih in atomaren audit.
- Dogodek konča samo v pregledu `review` in ima `posting=false`. Nikdar ne spremeni zaloge, glavne knjige ali izda računa.
- Omejitev: `APP_ENV=local/testing` IN `FINAI_SYNTHETIC_COMMERCE_STAGING_ENABLED=true` (privzeto OFF), brez HTTP route.

## Ciljni QA

`php artisan test --filter=Next14SyntheticSignedCommerceTest` v namenski SQLite `:memory:`.

Primeri: Shopify in WooCommerce, pravilno podpisan dogodek, ponovni identični vpis, napačen podpis, spremenjeno telo, napačen ponudnik, zastarel/bodoč podpisani čas, tuje podjetje, pravice, osebni podatki, neujemajoči centi, izključena zastavica in atomaren rollback ob napaki revizije.

## Naslednji koraki do prave integracije

1. Ločena testna konfiguracija trgovine s poverilnicami v namenski varovani shrambi, nikoli v GitHubu ali klepetu.
2. Poseben HTTPS provider adapter z avtorizacijo, preverjanjem podpisov dejanskih formatov in varovanjem pred ponovitvijo dogodkov.
3. Čakalna vrsta, omejitve hitrosti, ponovni poskusi, dead-letter pregled, idempotentnost ter revizija skladnosti.
4. Uskladitev različnih davčnih pravil, valut, zalog in partnerjev pred dejanskim knjiženjem.
5. Ločen FinAI OS/cPanel račun in zasebna testna baza z minimalnimi privilegiji.

Strežnik Hiper M ostaja nedotaknjen. Laškoteka, STNG, skupni cPanel/SSH/DNS in `laskot48` so izven dosega FinAI razvojnega pisanja.