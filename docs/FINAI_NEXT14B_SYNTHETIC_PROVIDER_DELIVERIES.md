# FinAI NEXT-14B — različni Shopify in WooCommerce testni sprejemni adapterji

**Izolirana testna aplikacijska storitev; brez HTTP endpointa, resničnih webhookov, API ključev ali trgovskih podatkov.**

## Izvedeno

- `StageSyntheticProviderDelivery` ločeno normalizira glave HTTP (imena neobčutljiva za velikost črk), zavrne podvojene glave, nepričakovana polja in vrednosti z CR/LF.
- Shopify sprejme samo izmišljeni `synthetic-shop.myshopify.com`, `orders/create`, HMAC `X-Shopify-Hmac-SHA256` ter UUID iz `X-Shopify-Webhook-Id`. Iz UUID izvleče stabilen dogodek `SYN-SHOP-...`.
- WooCommerce sprejme samo `order.created`, `order`, HMAC `X-WC-Webhook-Signature` in decimalni `X-WC-Webhook-Delivery-ID`. Iz številke izpelje `SYN-WC-DEL-...`.
- HMAC-SHA256 se preveri **nad natančnimi surovimi bajti pred vsakim razčlenjevanjem JSON**. Podpisan sintetični `eventId` mora ustrezati identifikatorju dostave iz glave; različne ali neznane dostave so zavrnjene.
- Za obe storitvi sledi obstoječi lokalni/testni pogodbi `StageVerifiedSyntheticCommerceWebhook` + `StageSyntheticCommerceOrder`: preverjeni podpisani `issuedAt` ±300 s, izključno sintetični ID-ji, podjetje/pravice, izmišljeno skladišče, SKU preslikava, `review`, `posting=false`, idempotentnost in transakcijski audit.
- Dvojna kontrola `APP_ENV=local/testing` IN `FINAI_SYNTHETIC_COMMERCE_STAGING_ENABLED` je privzeto izključena. Nikoli ni ustvarjena produkcijska javna pot.

## Zelo pomembna razlika do produkcijskih webhookov

Glave dogodkov in način njihovega HMAC podpisovanja sledijo uradni dokumentaciji ponudnikov, **vsebina telesa pa je namenoma lasten strogo sintetični FinAI testni format**, ne realni Shopify/WooCommerce poslovni JSON. Pravih dogodkov/strank ta storitev niti ne more sprejeti. Realno integracijo zahtevajo ločeni ponudniški dekoderji z varnim izločanjem PII po overjenem podpisu, urejenimi plačili in davki, verifikacijo izvora, čakalno vrsto in revizijo.

Uradni dokumentaciji: https://shopify.dev/docs/apps/build/webhooks/verify-deliveries in https://developer.woocommerce.com/docs/apis/rest-api/v1/webhooks

## Ciljni QA

`php artisan test --filter=Next14bSyntheticProviderDeliveryTest` v izolirani SQLite `:memory:` in povezani `Next14SyntheticSignedCommerceTest`.

Preverjanje: obe ponudniški glavi v različnih velikostih črk, podpisan dogodek, ponovljen dogodek, neveljaven podpis, spremenjeno telo, tuja dostava, tuja trgovina, podvojene glave, dodatni Authorization header, tuje podjetje, napačna pravica in poskus vnosa osebnih podatkov.

## Pred produkcijo

Poseben izoliran FinAI OS/cPanel in lastna baza, strogo zasebna shramba poverilnic, neposredni provider HMAC+replay test, skladnost točk ERP/zaloge/računovodstva, revizija dostave in obnova. Dotlej brez resničnih podatkov, FURS ali objave.

Absolutna prepoved posegov v Laškoteko, STNG, skupni `laskot48`, SSH, cPanel, DNS in podatkovne baze drugih projektov.