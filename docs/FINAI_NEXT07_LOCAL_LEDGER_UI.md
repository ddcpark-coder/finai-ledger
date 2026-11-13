# FINAI NEXT-07 — povezava preglednega poslovnega toka z izoliranim zaledjem

Poleg obstoječega sintetičnega UI poslovnega toka je dodana **druga**, jasno označena kontrola stanja transakcijskega testa iz NEXT-06.

- Vidna je samo v lokalnem brskalniku `localhost`/`127.0.0.1` in če je `NEXT_PUBLIC_FINAI_SYNTHETIC_LEDGER_API_BASE` nastavljen na identičen origin + `/api`.
- Izrecna prijava, CSRF in upravičenja `accounting.post` se še vedno preverijo na Laravel zaledju. Potrebna sta tudi `APP_ENV=local/testing` in `FINAI_SYNTHETIC_LEDGER_SCENARIO_ENABLED=true`.
- Uporabnik ročno preveri zaledno stanje in sproži rezervacijo, izdajo, demo knjižbo ter storno. Vsak POST uporablja UUID dogodka in pričakovano verzijo. Ob izgubljenem omrežnem odgovoru je ponovni klik v isti seji idempotenten, brez samodejnega background POST.
- V UI so prikazane demo zaloge in uravnoteženost zadnje demonstracijske knjižbe; to niso dejanske zaloge in **ni** knjiženje v produkcijsko glavno knjigo.
- Na javnem Hiper M, Vercel zaščitenem predogledu ali brez razvojne zastavice je nadzorna plošča skrita in ni mogoče poslati podatkov v testni API.
- `node --test tests/syntheticLedgerClient.test.mjs` preveri fail-closed ciljni origin, CSRF, tenant odgovor, ročno pošiljanje ter 401/403/409. Zaledni Laravel test je v NEXT-06.

Vse izvajanje ostaja znotraj FinAI. Brez posegov v Laškoteko, STNG ali skupne cPanel/SSH/DB nastavitve.
