# FinAI Ledger — Accounting Core v1

## Namen
FAZA 4 določa minimalno računovodsko jedro, na katerem bodo kasneje zgrajeni računi, banka, DDV, poročila in AI knjiženje.

## Entitete
- FiscalYear
- AccountingPeriod
- Account
- CostCenter
- TaxCode
- Journal
- JournalEntry
- OpenItem

## Trde invariantne zahteve
1. Vsaka knjižena temeljnica mora biti uravnotežena: vsota breme = vsota dobro.
2. Posamezna vrstica vsebuje breme ali dobro, nikoli obojega.
3. Knjiženje je dovoljeno samo na aktiven, knjižljiv konto istega podjetja.
4. Datum knjiženja mora biti znotraj izbranega odprtega obdobja.
5. Zaklenjeno obdobje ne sprejema novih ali spremenjenih knjižb.
6. Knjižena temeljnica se ne prepisuje. Popravek se izvede s storno/korekcijsko temeljnico.
7. Vsako knjiženje, storno in zaklep obdobja ustvari audit dogodek.
8. Zneski v aplikacijski validaciji se primerjajo v centih, ne s floating-point aritmetiko.
9. Vse poslovne entitete so scoped na company_id.
10. AI nikoli ne obide teh invariantov.

## Kontni načrt
Kontni načrt je po podjetju prilagodljiv. Faza 4 ne zaklepa produkcije na en konkreten slovenski kontni načrt; uvoz/predloge bomo dodali ločeno in jih pred produkcijo računovodsko validirali.

## DDV oznake
TaxCode je tehnična domena za povezovanje vrstic z davčno obravnavo. Konkretni produkcijski DDV šifranti in mappingi na poročila bodo potrjeni v fazi DDV/FURS.

## Saldakonti
OpenItem omogoča odprte terjatve in obveznosti. Partner bo v FAZI 5 dobil lasten FK; do takrat je predviden counterparty_ref.

## Storno
ReverseJournal izdela novo temeljnico z obrnjenimi breme/dobro postavkami in poveže reversal_of_id. Original ostane v revizijski sledi.

## Zaklep obdobja
Obdobja z osnutki se ne sme zakleniti. Odklep bo privilegirana, posebej auditirana operacija in bo dodan šele skupaj s produkcijskim authorization flowom.

## Naslednje
- povezava Partnerjev;
- avtomatsko ustvarjanje open items;
- številčenje temeljnic po pravilih podjetja;
- zaključne knjižbe;
- trial balance in glavna knjiga;
- DDV mapping;
- invariantni integracijski testi na pravi Laravel/MariaDB instanci.
