# FinAI NEXT27 — bralni predpregled v šifriranem Windows jedru

**Status:** notranja razvojna funkcija, **samo sintetični** podatki, brez javnega uporabniškega gumba.

## Izvedeno
- \`EncryptedLedgerStore.Preview(session, companyId, lines)\` preveri trenutno aktivno lokalno sejo, pravice podjetja (samo uporabnik z dovoljenjem pisanja), 2–100 enostranskih postavk, registracijo vseh kontov v istem podjetju ter uravnoteženost v celih centih. Posamezna postavka sme imeti največ \`1_000_000_000_000\` centov.
- Metoda **ne zapiše** temeljnice, spremembe statusa, revizijskega dogodka, datoteke ali sporočila. Vrne samo število postavk, debet, kredit in \`PostingAllowed=false\`.
- Izvajanje je lokalno nad obstoječo šifrirano SQLite3MC bazo in overjeno DPAPI sejo. Ni mrežnih zahtev, novih ključev ali sprememb sheme.
- Obstoječa metoda \`Post\` ostaja popolnoma nespremenjena in mora ob morebitnem prihodnjem pravem knjiženju znova sama preveriti vse pogoje. Predpregled ni odobritev.

## Minimalni preizkus
Obstoječi Windows QA ukaz \`EIntegrator.Desktop.exe --encrypted-ledger-self-test\` zdaj preveri:
1. uspešen bralni pregled uravnoteženega sintetičnega osnutka;
2. da predpregled ne ustvari nobenega zapisa v tabelah \`journals\` ali \`audit_events\`;
3. zavrnitev bralnega pregleda za gledalca, tuje podjetje, neregistriran konto, neuravnotežene vsote in previsoke zneske;
4. obstoječo, nespremenjeno pot dejanskega zapisa v **izolirani testni bazi** ter obstoječe šifriranje in revizijo.

## Omejitve
- To **ni** celovita računovodska funkcija v Windows grafičnem vmesniku, ni produkcijsko knjiženje in ne vzpostavi sinhronizacije z Laravelom ali mobilno aplikacijo.
- Ni potrjene skladnosti s slovensko računovodsko ali davčno zakonodajo; ostanejo obvezni QA pravic, offline obnove, večpodjetniškega delovanja in natančne migracije.
- Spreminja se izključno FinAI GitHub koda. Laškoteka, STNG, skupni cPanel/SSH in Hiper M ostajajo nedotaknjeni.
