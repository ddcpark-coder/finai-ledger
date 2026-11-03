# FinAI Ledger — Ponudbe in predračuni

FAZA 16 uvaja verzionirane ponudbe, povezane s CRM, partnerji in centralnim katalogom.

## Workflow
draft -> sent -> viewed -> accepted / rejected / expired

## Verzije
Ponudbe se po pošiljanju ne prepisujejo. Sprememba ustvari novo verzijo z isto poslovno številko in višjo version vrednostjo.

## Postavke
QuoteLine lahko uporablja Product iz centralnega kataloga ali ročno opisno postavko. Cena je snapshot trenutne ponudbe; kasnejša sprememba cenika ne spreminja že poslane ponudbe.

## Sprejem prek varne povezave
Javna povezava uporablja naključni token; v bazi se hrani samo SHA-256 hash. Sprejem preveri status in datum veljavnosti.

## PDF in e-mail
Finalni PDF naj uporablja skupni DocumentRecord/DocumentMailer iz dokumentnega sistema. Pošiljanje ustvari quote event in ne sme blokirati web requesta.

## CRM
Quote je lahko povezan s crm_opportunity. Sprejeta ponudba je signal za naslednji prodajni korak.

## Pretvorba v naročilo
QuoteOrderConverter je contract. Dejanska entiteta naročila se implementira v FAZI 17, brez podvajanja quote logike.

## Performance
- seznami so company/status/date indeksirani;
- postavke se nalagajo šele ob odpiranju ponudbe;
- PDF generation/e-mail tečeta v job sloju;
- katalog search uporablja paginacijo in indeksirano iskanje.
