# FinAI Ledger — CRM

## Namen
FAZA 15 uvaja prodajni CRM, ki povezuje potencialno stranko, kontakt, partnerja, prodajno priložnost, aktivnosti in prihodnje ponudbe.

## Entitete
- CrmContact
- CrmLead
- CrmOpportunity
- CrmActivity
- CrmCommunication
- CrmTag

## Lead
Lead predstavlja še nepopolno kvalificirano prodajno možnost.

Podpira:
- vir
- lastnika
- oceno/score
- pričakovano vrednost
- naslednje dejanje
- povezavo s kontaktom ali partnerjem

## Opportunity pipeline
Faze:
- qualification
- discovery
- proposal
- negotiation
- won
- lost

Vsaka faza ima privzeto verjetnost, vendar jo bo pozneje mogoče prilagoditi na ravni podjetja.

## Aktivnosti
Aktivnost je lahko:
- call
- email
- meeting
- task
- follow_up

Aktivnosti so vedno company-scoped in lahko pripadajo partnerju, kontaktu, leadu ali priložnosti.

## Komunikacija
CrmCommunication je zgodovina pomembne komunikacije.

Predvideni kanali:
- email
- phone
- meeting
- note
- portal
- messaging

Zunanje vsebine se ne kopirajo nujno v celoti; shrani se poslovno relevanten povzetek in external_message_id.

## Lead -> Opportunity
ConvertLeadToOpportunity:
- zaklene lead
- prepreči dvojno konverzijo
- ustvari opportunity
- spremeni lead status v converted
- zapiše audit

## Pipeline
GetSalesPipeline agregira:
- število priložnosti
- nominalno vrednost
- weighted value

Agregacija poteka v SQL in ne nalaga vseh poslov v aplikacijski pomnilnik.

## Performance
CRM bo lahko zelo velik modul, zato:
- company/status/owner/due_date so indeksirani
- next actions imajo hard limit
- pipeline agregacija se izvaja v DB
- komunikacija je časovno indeksirana
- full-text iskanje se bo dodalo šele ob realni potrebi in velikosti podatkov

## Povezave
FAZA 16 Ponudbe bo uporabljala:
- partnerja
- kontakt
- opportunity
- cenik iz FAZE 14
- katalog artiklov/storitev

Potrjena ponudba bo nato lahko premaknila opportunity proti won oziroma kasneje ustvarila naročilo.
