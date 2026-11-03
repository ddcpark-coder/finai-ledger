# FinAI Ledger — Artikli, storitve in ceniki

## Namen
FAZA 14 uvaja centralni katalog, ki ga uporabljajo prodaja, nabava, ponudbe, naročila, dobavnice, zaloge, projekti in računi.

## Entitete
- UnitOfMeasure
- ProductCategory
- Product
- PriceList
- PriceListItem
- PartnerPriceList
- ProductSupplier

## Produkt
Product podpira:
- tip: product ali service
- SKU
- barcode
- naziv/opis
- mersko enoto
- kategorijo
- DDV oznako
- prihodkovni konto
- stroškovni konto
- nabavno ceno
- prodajno ceno
- minimalno prodajno ceno
- privzeti popust
- track_inventory
- minimalno zalogo

## Ceniki
Cenik je company-scoped in ima:
- valuto
- veljavnost
- prioriteto
- aktivnost

Cena se lahko veže na:
- partnerja prek PartnerPriceList
- količinski prag prek min_quantity

ResolveSalesPrice najprej poišče veljaven partnerjev cenik, nato pade nazaj na privzeto ceno produkta.

## Dobavitelji
ProductSupplier povezuje izdelek z dobaviteljem:
- dobaviteljski SKU
- zadnjo/standardno nabavno ceno
- lead time
- preferred dobavitelj

## Marža
MarginCalculator loči:
- gross margin %
- markup %

To je pomembno, ker izraza nista enaka.

## Performance
Katalog je read-heavy.
Zato:
- list endpointi morajo biti paginirani
- SKU/barcode/company/type/active so indeksirani
- reference podatki (merske enote, kategorije, davčne oznake) so kandidati za cache
- cenovna resolucija ne sme nalagati celotnih cenikov v aplikacijski pomnilnik

## Nadaljevanje
FAZA 15 CRM bo uporabljala partnerje in cenike, FAZA 16 ponudbe pa bo uporabljala centralni katalog in ResolveSalesPrice.
