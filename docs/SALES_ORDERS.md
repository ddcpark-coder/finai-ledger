# FinAI Ledger — Naročila kupcev

FAZA 17 uvaja prodajno naročilo kot vezni člen med sprejeto ponudbo, izvedbo, dobavnico in računom.

## Tok
accepted quote -> confirmed order -> in_progress -> ready_for_delivery -> delivered -> invoiced -> completed

Podprta sta tudi partial delivery in cancellation v dovoljenih fazah.

## Pretvorba ponudbe
ConvertAcceptedQuoteToOrder:
- zahteva accepted quote;
- je idempotenten po quote_id;
- kopira cenovni snapshot in postavke;
- za artikle z track_inventory ustvari reservation request;
- zapiše event.

## Rezervacije
V tej fazi rezervacija predstavlja zahtevo po rezervaciji. Dejanski skladiščni saldo in warehouse allocation se implementirata v FAZI 19, brez lažnega zmanjševanja zalog pred uvedbo skladiščnega jedra.

## Dobavnica in račun
delivery_notes in issued_invoices imata sales_order_id, zato lahko sledimo:
naročilo -> dobavnica -> podpis -> račun -> plačilo.

## Performance
- company/status/delivery date so indeksirani;
- list pogled ne nalaga postavk;
- postavke in rezervacije se naložijo ob odprtju naročila;
- številčenje bo pred produkcijo prestavljeno na transakcijski sequence servis, enak princip kot pri računih.
