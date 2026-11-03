# FinAI Ledger — Projekti in delovni nalogi

FAZA 20 povezuje prodajo, delo, material, nabavo, dobavnice in finance v projektno donosnost.

## Projekt
Projekt je lahko ustvarjen iz prodajnega naročila in hrani:
- partnerja
- prodajno naročilo
- lastnika
- roke
- budget revenue/cost
- actual revenue/cost/margin

## Naloge in delovni nalogi
ProjectTask predstavlja planirano delo.
WorkOrder predstavlja izvršilni nalog za interno ali terensko delo.

Oba sta indeksirana po projektu, statusu, uporabniku in rokih.

## Evidenca časa
TimeEntry hrani:
- projekt
- nalogo/delovni nalog
- uporabnika
- datum
- ure
- stroškovno urno postavko
- pozneje tudi billable rate

Potrjena ura ustvari materializiran project financial cost.

## Projektne finance
ProjectFinancialEntry je materializirana finančna sled za hiter dashboard.

Viri:
- izdani računi -> revenue
- prejeti računi -> supplier cost
- inventory issue z unit_cost -> material cost
- time entry -> labor cost

Vsak zapis vsebuje source_type/source_id, zato ostane sledljiv do izvora.

## Donosnost
projects hrani že izračunane:
- actual_revenue
- actual_cost
- actual_margin
- actual_margin_percent

Dashboard zato ne sešteva vseh računov in premikov pri vsakem odpiranju.

## Povezave
Projekt se lahko neposredno poveže z:
- sales order
- purchase order
- incoming invoice
- issued invoice
- delivery note
- inventory movement

## Performance
- list projektov bere materializirana polja na projects;
- finančni detajl bere project_financial_entries;
- raw dokumente/premike se odpira samo na zahtevo;
- refresh finančnih virov se lahko izvaja v job/queue sloju;
- indeksi pokrivajo company/status/due date, project/date in assigned user/status.

## Naslednje
- mobilni clock-in/clock-out;
- gantt/timeline;
- capacity planning;
- dependencies;
- customer milestones;
- project templates;
- AI napoved zamude in prekoračitve stroškov.
