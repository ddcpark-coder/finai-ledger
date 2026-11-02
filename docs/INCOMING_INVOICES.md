# FinAI Ledger — Prejeti računi v1

## Namen
FAZA 6 uvaja vhodni dokumentni tok za prejete račune in ga povezuje s partnerji, DDV, AI predlogom ter računovodskim jedrom.

## Workflow
`received -> processing -> review -> approved -> posted`

Alternativna stanja:
- rejected
- failed

## Dokument
Originalna datoteka je ločena od poslovnega zapisa računa. Baza hrani:
- original_name
- MIME
- size
- SHA-256
- storage disk/path
- status

Enak SHA-256 znotraj istega podjetja se obravnava kot možen duplikat.

## Prejeti račun
Glava vsebuje:
- partner
- številko računa
- datum izdaje
- datum opravljene storitve
- rok plačila
- valuto
- neto / DDV / bruto
- confidence ekstrakcije
- confidence računovodskega predloga
- status odobritve
- povezavo na temeljnico po knjiženju

## Postavke
Vsaka postavka podpira:
- opis
- količino
- ceno
- neto
- stopnjo DDV
- DDV
- bruto
- tax_code
- suggested_account
- cost_center
- AI confidence

## Ekstrakcija
InvoiceExtractor je adapter contract. Implementacija lahko uporablja:
- XML/e-račun parser
- OCR
- Document AI
- drug zamenljiv provider

Jedro aplikacije ni vezano na enega ponudnika.

## AI
AccountingProposal je samo predlog. AI ne knjiži mimo računovodskih invariantov.
Predlog se lahko:
- supersede-a z novejšim predlogom;
- potrdi/zavrne v review workflowu;
- pretvori v temeljnico šele po validaciji in odobritvi.

## Kontrole
- partner, številka računa, datum in bruto znesek so obvezni pred odobritvijo;
- vsota postavk mora ustrezati glavi;
- neto + DDV = bruto na vsaki postavki;
- denarne kontrole se izvajajo v centih;
- audit beleži odobritev;
- failed extraction ne izbriše originalnega dokumenta;
- ponovno procesiranje je dovoljeno iz stanja failed.

## Varnost
Datoteke niso javne po neposrednem URL-ju. Produkcijski storage mora uporabljati avtoriziran download/stream endpoint.

## Naslednje
- fizični upload endpoint z MIME/size/antivirus validacijo;
- dejanski XML/e-SLOG parser;
- konfiguriran OCR/Document AI provider;
- avtomatsko prepoznavanje partnerja;
- ustvarjanje temeljnice iz odobrenega predloga;
- kreiranje open item ob knjiženju;
- workflow dovoljenja in notifications.
