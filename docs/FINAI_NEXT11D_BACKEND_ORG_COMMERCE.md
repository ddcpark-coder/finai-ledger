# FinAI NEXT11D — izolirana podatkovna struktura poslovnih enot in testni e-commerce inbox

## Arhitektura, brez objave na gostovanje

Nova osnovna Laravel migracija opredeli business_units, business_unit_warehouses, commerce_connections, commerce_sku_mappings in commerce_order_events. Migracija je samo del GitHub kode in je preizkušena izključno na SQLite :memory:. Na Hiper M ne ustvarja tabel in ne spreminja shem Laškoteke ali STNG.

BusinessUnitRegistry zahteva aktivnega člana podjetja s pravico inventory.write. Enota je vezana na pravno osebo, skladišče sme biti dodeljeno le enkrat in samo svoji pravni osebi. Vsako dejansko spremembo spremlja atomaren revizijski zapis.

CommerceOrderContract normalizira samo PII-free sintetične dogodke WooCommerce in Shopify. Vhodna pogodba vsebuje točno: demoOnly, companyId, provider, connectionCode, warehouseId, eventId, externalOrderId, currency, lines, totalCents. Ne dovoljuje kupcev, naslovov, elektronskih sporočil, gesel, webhookov ali dodatnih polj.

StageSyntheticCommerceOrder je aplikacijska storitev BREZ javne HTTP poti in BREZ kakršnegakoli omrežnega odjemalca. Obvezna sta APP_ENV=local/testing in izrecna zastavica FINAI_SYNTHETIC_COMMERCE_STAGING_ENABLED, privzeto false, dodatno pa aktiven član podjetja s pravico orders.write. Dogodke lahko sprejme samo na vnaprej pripravljeni, neaktivni osnutek povezave, ob preverjeni preslikavi SKU, veljavnem skladišču in točnih centih. Sprememb istega dogodka ali podvojenih naročil ne prepisuje.

Vsak dogodek se zapiše kot review; posting=false. Ne ustvarja naročil, prevzemov, računov, plačil, bančnih dogodkov ali knjižb in ne zmanjšuje zalog. Ne hrani skrivnosti.

Izolirani QA preverja dve podjetji, pravice, neaktivni API, WooCommerce in Shopify, idempotenten replay, drugačne dogodke in negativen scenarij z manjkajočo revizijsko tabelo.

## Pred resničnim e-commerce konektorjem

Potrebni so dodatni izolacija infrastrukture, varna hramba poverilnic zunaj repo/klepeta, preverjeni podpisi webhookov, autorizacija prodajalne in podjetja, obdelava osebnih podatkov, mapping izdelkov v dejanski katalog, nadzor vrst, ponovni poskusi, ročno reševanje konfliktov, davčni/računovodski QA in skladnost z RS/EU. Ne uporabljaj tega testnega vhodnega pogodbenega formata za resnična naročila.
