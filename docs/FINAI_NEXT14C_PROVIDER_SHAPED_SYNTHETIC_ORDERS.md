# FinAI NEXT-14C — provider-shaped izmišljena naročila

## Izvedeno
- Nova interna storitev `StageSyntheticProviderOrder` uporablja obstoječe **podpisno preverjanje HMAC na izvirnih bajtih** in uporabniške/dostavne glave, preden razčleni ponudniški JSON. Nima javne HTTP poti in je izključena zunaj `local/testing` ter privzeto izključene funkcijske zastavice.
- Testni `shopify` objekt: `id`, `demoOnly=true`, podpisno vključen čas `issuedAt`, `currency=EUR`, `total_price`, `line_items[]` s `sku`, `quantity`, `price`.
- Testni `woocommerce` objekt: enaka sintetična varovala, `total` in `line_items[]` z dodatnim `total` na posamezni vrstici.
- Vsi ID naročil so izključno 7000–7999, vsak SKU se začne s `SYN-`. Obvezne so natančne decimalne **besedilne** cene EUR; integer cents matematika ter preverba vsote vrstic preprečujeta skrite zaokrožitve.
- Izvirni testni format se pretvori v obstoječo strogo `CommerceOrderContract` in z avtoriziranim `StageSyntheticCommerceOrder` shrani samo kot **`review`, `posting=false`**, s podjetniško izolacijo, skladno SKU preslikavo, idempotentnim event-id in atomarnim auditom.
- Vse nepričakovane JSON tipke (npr. `customer`, `billing`, `tax_lines`, `shipping_lines`, `discounts`) se zavrnejo. Noben realen naročniški/osebni podatkovni paket se ne sprejme ali shrani.
- Novo ciljano Laravel Feature preverjanje uporablja SQLite `:memory:`, dva ponudnika, ponovni isti podpisani dogodek, napačen podpis, napačne zneske, tuje podjetje, manjkajočo pravico, zastarel čas in poskus PII.

## Omejitve
To še **ni produkcijski Shopify ali WooCommerce decoder**. Pravi dogodki imajo več obveznih/izbirnih polj in lahko vsebujejo PII, dostavne stroške, davke, valute, popuste ali vračila. Pred javnim priklopom bodo potrebni dejanski ponudniški formati z varno minimalizacijo PII, namenski FinAI cPanel/OS račun, varovana hramba skrivnosti, podpisna rotacija, strežniška vrsta, pravilna obravnava DDV in povrnljive izdaje. Zdaj pravih webhookov **ne registriraj**.

Uradni viri za podatkovne oblike: [Shopify orders/create](https://shopify.dev/docs/api/admin-rest/2026-07/resources/webhook), [WooCommerce orders](https://developer.woocommerce.com/docs/apis/rest-api/v2/orders) in [WooCommerce webhooks](https://developer.woocommerce.com/docs/apis/rest-api/v2/webhooks/).

Varnostno območje: izključno FinAI GitHub in sintetični CI; Laškoteka, STNG, `laskot48`, skupne DB/SSH/cPanel/DNS ostanejo nedotaknjeni.
