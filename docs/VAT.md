# FinAI Ledger — DDV v1

## Namen
FAZA 10 uvaja interno DDV evidenco, davčna obdobja, kontrolna pravila, pripravo DDV obračuna in rekapitulacijskega poročila.

## Pomembna arhitekturna odločitev
Interni DDV model ni enak posamezni verziji obrazca eDavki. Jedro uporablja stabilne interne entitete, mapping na konkretna poročevalska polja pa je konfigurabilen prek TaxCode metadata in exporter adapterja.

To preprečuje, da bi sprememba FURS obrazca zahtevala prepis računovodskega jedra.

## Davčno obdobje
VatPeriod vsebuje:
- company_id
- period_key
- začetek/konec
- rok oddaje
- frekvenco
- status
- ali je zahtevano rekapitulacijsko poročilo

Rok se shranjuje eksplicitno, ker zakon pozna različne roke in izjeme.

## DDV evidence
VatEntry je normalizirana davčna vrstica iz:
- prejetega računa;
- izdanega računa;
- temeljnice oziroma drugega dovoljenega vira.

Hrani:
- tax_code;
- smer input/output;
- davčno osnovo;
- obračunani DDV;
- odbitni DDV;
- državo;
- VAT ID partnerja;
- reporting tags.

## DDV-O
BuildVatReturn iz evidenc ustvari verzioniran osnutek DDV obračuna. calculated_fields ostajajo interni izračuni; natančen mapping na aktualno DDV-O XML shemo izvede VatReturnExporter.

## RP-O / VIES
BuildRecapitulativeReport agregira samo ustrezno označene EU transakcije. Popravki preteklih obdobij morajo biti ločeni od tekočih zneskov.

## Kontrolna pravila
Prva verzija preverja:
- tuje transakcije brez VAT ID;
- negativne tekoče zneske v RP-O;
- tax_code brez poročevalnega mappinga.

## Aktualna FURS izhodišča preverjena 2. 11. 2026
Po eDavki mora DDV-zavezanec predložiti DDV-O za davčno obdobje; splošni rok je zadnji delovni dan naslednjega meseca, pri zavezancu, ki mora predložiti rekapitulacijsko poročilo, pa je DDV-O vezan na rok do 20. dne naslednjega meseca. RP-O se oddaja mesečno do 20. dne naslednjega meseca.

Zato sistem roka ne izračuna kot eno trdo pravilo, ampak ga shrani kot filing_due_on in ga bo produkcijska davčna konfiguracija določala glede na status zavezanca in obveznosti.

## Odobritev
VAT return se ne more odobriti, če obstaja odprta kontrola severity=error.

## Izvoz
VatReturnExporter je adapter contract za eDavki-compatible XML oziroma drug aktualen format.

## Naslednje
- production mapping TaxCode -> DDV-O polja;
- aktualna eDavki XML shema;
- evidence obračunanega DDV in odbitka DDV;
- PD-O;
- popravki preteklih obdobij;
- submission adapter v FAZI 11.
