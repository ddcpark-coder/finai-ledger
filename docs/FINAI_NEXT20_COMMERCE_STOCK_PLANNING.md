# FinAI NEXT-20 — takojšen izračun trgovinskega naročila in razpoložljive zaloge

## Izvedena funkcionalnost

V obstoječem modulu **Integracije** lahko za sintetična WooCommerce / Shopify naročila uporabnik pred uvrstitvijo v pregled izbere **skladišče, SKU, količino in ceno na enoto v EUR**. Zneski se računajo v celih centih, brez plavajoče vejice (dovoljena pika ali vejica, največ dve decimalki). Izračun se osveži ob spremembi vsakega vnosa.

Načrtovalnik primerja testno razpoložljivo količino po skladiščih: `onHand − reserved` z naročili v stanju `review` ali `reviewed` ter trenutno predlagano količino. Izračuna morebitno negativno napoved in pomanjkanje ter po SKU izračuna *informativne* predloge medskladiščne prerazporeditve. Predlogi nikoli ne porabijo iste razpoložljive količine pri dveh primanjkljajih. Naročila v stanju `hold` so vidna ločeno, vendar se ne štejejo v predvideno porabo.

Uporabnik lahko predlog uvrsti v lokalno pregledno vrsto in nato označi `reviewed` ali `hold`. Različica, ID dogodka, podjetje, ponudnik, SKU in znesek se preverjajo po obstoječih pravilih demo modela. Nov sintetični dogodek je unikaten za trenutno lokalno vrsto, obračunani znesek pa se ujema s postavkami.

## Pomembne poslovne omejitve

- **To ni rezervacija zalog, dejanski medskladiščni prenos ali ERP knjižba.** `posting=false`, `inventoryReserved=false` in izključno lokalna, začasna demo stanja.
- Predogled računa **osnovno količinsko vrednost brez DDV**, popustov, dostave ali dejanskih cenikov. Nobenega resničnega dokumenta, davčnega računa, plačila ali FURS obveznosti ne ustvarja.
- Trenutni modul Integracije vsebuje **svoj neodvisen sintetični skladiščni model**. Drugi samostojni demonstracijski pogled Zaloge ni avtomatsko usklajen; to bo povezano šele v avtoriziranem večpodjetnem zaledju.
- Sprememba ne vzpostavi nobene resnične povezave s Shopify/WooCommerce, ne uporablja poverilnic in ne spreminja podatkovnih baz ali gostovanja.

## Minimalni ciljni QA

- `tests/next20CommerceStockPlanning.test.mjs`: integer-cents cene (vejica/pika), osvežitev scenarija, negativna zaloga, omejitev donorskih količin, statusi `review`, `reviewed` in `hold`, zavrnitve napačnega podjetja/SKU ter nedotaknjena fizična zaloga;
- `tests/e2e/next20-commerce-stock.spec.cjs`: brskalniški preizkus novega načrtovalnika, trenutnega izračuna, zadržanja in izolacije podjetja brez HTTP pisanja;
- obstoječi `finai-next11-operations-qa.yml`: ciljni Node testi ter obvezna statična gradnja Next.js; obstoječi ločeni brskalniški workflow preveri prikaz interakcij.

Pred resničnim skladiščnim ali računovodskim delovanjem potrebujemo izoliran FinAI OS/cPanel račun, namensko bazo, inventurne kontrole, revizijsko sled, e-trgovinske API ključe, obnovo, varnostni ter davčno-računovodski QA za RS/EU. Hiper M `laskot48` ostaja read-only, Laškoteka in STNG nedotaknjeni.