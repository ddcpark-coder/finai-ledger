# FinAI NEXT-12C — stroga izolacija CRM in poslovnih enot

Status: razvojna koda brez javne CRM API poti, brez migracije na Hiper M.

## Implementirano

- Nova povezovalna tabela `crm_opportunity_business_units` zagotavlja eno dodelitev poslovne enote na CRM priložnost. Migracija je predvidena samo za izolirano FinAI testno bazo.
- `AssignOpportunityBusinessUnit` preverja aktivno članstvo in `crm.write`, podjetje, enoto in vse reference ter doda atomarni audit. Enak ponovni vpis ne ustvari nove spremembe.
- `ConvertLeadToOpportunity` preverja `crm.write`, podjetje, partnerja, kontakt, lastnika, izbirno poslovno enoto in status; ustvarjanje priložnosti, premik stanja in audit so ena transakcija.
- `MoveOpportunityStage` zahteva podjetje in `crm.write`. Dovoli samo naslednjo fazo ali izgubo iz odprte faze; zaključene priložnosti ne odpira ponovno. Preverja tudi poslovno enoto in revizijski zapis.
- `GetSalesPipeline` ter `GetNextActions` zahtevata `crm.read`. Pipeline je company-scoped z izbirnim filtrom poslovne enote; vrednosti so načrtovane ocene, ne zneski glavne knjige.

## Interni podpisi

- `ConvertLeadToOpportunity::execute(companyId, leadId, actorId, businessUnitId?)`
- `MoveOpportunityStage::execute(companyId, opportunityId, stage, actorId, businessUnitId?)`
- `GetSalesPipeline::execute(companyId, actorId, ownerUserId?, businessUnitId?)`
- `GetNextActions::execute(companyId, actorId, limit)`
- `AssignOpportunityBusinessUnit::execute(companyId, actorId, opportunityId, businessUnitId)`

Ni novih javnih HTTP poti. Pred priklopom produkcijskih odjemalcev je treba pregledati vse morebitne klicatelje sprememb podpisov.

## Sintetični QA

`php artisan test --filter=Next12cCrmTenantUnitTest`

Test: dve podjetji, različna dovoljenja, tuji partnerji/kontakti, tuje poslovne enote, ponovitev, prehodi faz, izolirani vpogledi in transakcijske povrnitve ob napaki audita. Testna baza je izključno SQLite `:memory:`.

## Odprto

- Dodatni MariaDB konkurenčni/migracijski QA na namenski izolirani bazi.
- Migracije se ne izvajajo na skupnem gostovanju ali produkcijski bazi.
- Windows/mobile offline prikaza ostajata sintetična, brez samodejne sinhronizacije in brez realnih podatkov.
- Pred javno produkcijo obvezni šifriranje, obnovitev, preverjena izolacija, HTTPS ter računovodski in varnostni QA.

Absolutna prepoved posegov v Laškoteko, STNG, skupni cPanel/SSH in `laskot48`. Vercel ni produkcijsko gostovanje.
