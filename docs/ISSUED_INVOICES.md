# FinAI Ledger — Izdani računi v1

## Namen
FAZA 8 uvaja življenjski cikel izdanega računa od osnutka do izdaje, pošiljanja, terjatve in knjiženja.

## Workflow
`draft -> issued -> sent -> partially_paid -> paid`

Dodatna stanja:
- overdue
- cancelled

## Številčenje
InvoiceSequence je ločena entiteta po podjetju, vrsti in letu. Številka se dodeli transakcijsko z row lockom, da dva hkratna procesa ne dobita iste številke.

Primer konfiguracije:
- key: sales_invoice
- prefix: 2026-
- next_number: 54
- padding: 4

## Izdaja
Pred izdajo se preveri:
- partner;
- datum izdaje;
- rok plačila;
- bruto znesek;
- najmanj ena postavka;
- matematična skladnost glave in postavk.

Po izdaji račun ni več običajen osnutek za prosto prepisovanje.

## Postavke
Podpirajo:
- opis;
- količino;
- ceno;
- popust;
- neto;
- DDV stopnjo in znesek;
- bruto;
- tax_code;
- revenue account;
- cost center.

## PDF / e-račun
InvoiceRenderer je adapter contract za izdelavo:
- PDF;
- strukturiranega XML/e-računa.

Generirani artifact se shrani z SHA-256.

## Pošiljanje
InvoiceDeliveryProvider je adapter contract. Dostava se beleži v invoice_deliveries:
- kanal;
- prejemnik;
- status;
- provider message ID;
- napaka;
- čas poskusa.

## Knjiženje
BuildIssuedInvoiceJournal pripravi:
- breme terjatev do kupca;
- dobro prihodkov po postavkah;
- dobro izhodnega DDV;
- open item za terjatev.

Končno knjiženje še vedno izvede računovodsko jedro PostJournal.

## Terjatve
Ob pripravi temeljnice se ustvari open_item:
- partner;
- referenca računa;
- datum zapadlosti;
- originalni znesek;
- odprti znesek;
- valuta.

## Integritete
- številčenje je transakcijsko;
- izdan račun ne more dobiti iste številke kot drug račun istega podjetja;
- revenue account mora pripadati istemu podjetju in biti knjižljiv;
- izdaja ne obide validacije postavk;
- ustvarjena temeljnica mora biti uravnotežena;
- open item je vezan na terjatveni journal entry.

## Naslednje
- dejanski PDF renderer;
- e-SLOG/EN16931 profil po aktualnih slovenskih zahtevah;
- pošiljanje po e-pošti/e-račun omrežju;
- dobropisi in bremepisi;
- plačila in avtomatsko zapiranje terjatev;
- opomini.
