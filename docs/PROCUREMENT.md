# FinAI Ledger — Nabava

FAZA 18 uvaja celoten nabavni tok:
potreba -> povpraševanje -> ponudbe dobaviteljev -> naročilnica -> prevzem -> prejeti račun -> 3-way match.

## Potrebe
PurchaseRequisition lahko nastane ročno ali iz sales order / prihodnje zalogovne potrebe.

## Povpraševanje
SupplierRequest se pošlje več dobaviteljem. SupplierOffer shrani primerljive ponudbe, cene in dobavne roke.

## Naročilnica
PurchaseOrder ima transakcijsko številčenje in je company/partner scoped.

## Prevzem
GoodsReceipt podpira delne prevzeme, zavrnjene količine in quality status. Količina ne sme preseči odprte količine naročilnice.

## 3-way match
RunThreeWayMatch primerja:
1. naročeno količino in vrednost,
2. dejansko prevzeto količino,
3. prejeti račun.

Odstopanja se zapišejo v purchase_invoice_matches in se ne skrivajo.

## Povezava s prodajo
PurchaseRequisition in PurchaseOrder lahko nosita sales_order_id, zato je mogoče slediti nabavi materiala za konkretno kupčevo naročilo.

## Zaloge
FAZA 18 še ne vodi fizičnega skladiščnega salda. GoodsReceipt je vir za FAZO 19, kjer bo prevzem ustvaril warehouse movement.

## Performance
- status/date/company indeksi na vseh glavnih listih;
- postavke se naložijo ob odprtju;
- primerjava dobaviteljskih ponudb uporablja omejene query-je;
- večji uvozi in PDF/e-mail naročilnic tečejo asinhrono.
