# FinAI Ledger — Banka in usklajevanje v1

## Namen
FAZA 9 uvaja bančne račune, izpiske, transakcije, matching z odprtimi postavkami, delna plačila in pripravo SEPA plačil.

## Entitete
- BankAccount
- BankStatement
- BankTransaction
- BankTransactionMatch
- PaymentBatch
- PaymentBatchItem

## Uvoz izpiskov
BankStatementImporter je adapter contract za:
- CAMT.053;
- CSV;
- druge podprte bančne formate.

Parser vrne normalizirane podatke, poslovno jedro pa ostane neodvisno od banke.

## Usklajevanje
Matching temelji na:
- partnerju;
- valuti;
- znesku;
- sklicu/reference;
- odprtem saldu.

Predlog confidence je informativen. Končna uskladitev vedno preveri:
- isto podjetje;
- razpoložljiv znesek transakcije;
- odprti znesek postavke;
- delna plačila.

## Delna plačila
Ena bančna transakcija se lahko razdeli na več odprtih postavk in obratno. Statusi:
- unmatched
- partial
- matched

OpenItem:
- open
- partial
- closed

## Knjiženje
Bančna transakcija ima journal_id. Končno knjiženje se izvede skozi računovodsko jedro in ne sme obiti BalanceCalculator/PostJournal.

## SEPA
PaymentBatch predstavlja paket plačil. SepaPaymentExporter pripravi npr. pain.001 XML. Dejanski profil/schema se pred produkcijo validira proti aktualnim zahtevam banke oziroma standarda.

## Kontrole
- IBAN je vezan na podjetje;
- ni cross-company usklajevanja;
- matched_amount ne sme preseči transakcije ali odprte postavke;
- vsako usklajevanje ustvari audit dogodek;
- zunanji parser ne določa sam računovodskega knjiženja.

## Naslednje
- CAMT.053 parser;
- bančni API/PSD2 provider po izbiri;
- avtomatsko prepoznavanje partnerja po IBAN;
- generiranje bančne temeljnice;
- pain.001 generator;
- payment approval workflow;
- dvofazna odobritev večjih plačil.
