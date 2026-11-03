# FinAI Ledger — Zaloge in skladišča

FAZA 19 uvaja pravo skladiščno jedro.

## Arhitektura
FinAI uporablja dvojni model:
1. `inventory_movements` = nespremenljiva sled vseh premikov;
2. `inventory_balances` = hiter materializiran saldo za vsakodnevne poizvedbe.

Tako poročanje ne sešteva milijonov premikov ob vsakem odpiranju kataloga, audit pa ostane popoln.

## Skladišča in lokacije
Podprto je:
- več skladišč;
- več lokacij znotraj skladišča;
- receiving/shipping privzeto skladišče;
- lokacijski tipi.

## Saldo
Za kombinacijo warehouse + location + product se vodi:
- on_hand;
- reserved;
- available;
- incoming;
- average_cost.

`available = on_hand - reserved`.

## Nabava
GoodsReceipt lahko določi warehouse_id.
PostGoodsReceiptToInventory iz sprejetih količin ustvari receipt movement. Zavrnjene količine ne povečajo zaloge.

Operacija je idempotentna na goods_receipt_line.

## Prodaja
Reservation request iz FAZE 17 se pretvori v pravo inventory reservation. Rezervacija zmanjša available, ne pa on_hand.

Fizična izdaja bo pri dobavnici zmanjšala on_hand in hkrati sprostila rezervacijo.

## Premiki
Movement types vključujejo:
- receipt
- issue
- transfer_out / transfer_in
- stock_count_adjustment
- return
- correction

Negativna fizična zaloga in kršitev aktivnih rezervacij sta blokirani.

## Inventura
StockCount zajame sistemsko stanje in fizično prešteto količino. Posting ustvari adjustment movements, ne prepisuje zgodovine.

## Opozorila
DetectInventoryAlerts primerja skupno available zalogo z min_stock_level artikla in ustvari below_minimum opozorilo.

## Performance
Ključno pravilo:
- uporabniški listi berejo inventory_balances;
- audit/forenzika uporablja inventory_movements;
- indeksi so na company/product/warehouse/date;
- velika zgodovina se vedno paginira;
- rebuild saldov in večje analize tečejo asinhrono.

## Naslednje
- izdaja blaga iz podpisane dobavnice;
- lot/serial tracking;
- expiry dates;
- barcode/QR scanning;
- reorder suggestions;
- ABC/XYZ analiza;
- vrednotenje FIFO/weighted average po potrjeni računovodski politiki.
