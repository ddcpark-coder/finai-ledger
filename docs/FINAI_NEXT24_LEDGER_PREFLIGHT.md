# FinAI NEXT-24 – sintetični predpregled dvostavčnega knjiženja

**Status:** razvojni predpregled brez knjiženja, brez povezave s produkcijo in brez podatkov resničnih podjetij.

Novi `app/next11/syntheticLedgerPreflight.mjs` je čista funkcija, ki preveri minimalni sintetični osnutek temeljnice: identiteto podjetja, EUR, sintetično referenco, sintetične konte, zneske v celih centih, natanko eno stran vsake vrstice in uravnoteženost debet/kredit. Vrne zamrznjen, strogo omejen rezultat brez osebnih podatkov ter z `postingAllowed: false`.

Ta korak **ne** vzpostavlja kontnega načrta, zakonskih davčnih pravil, knjiženja v glavno knjigo, materialnih zalog, obračunov DDV, FURS integracije, banke ali uporabniške potrditve. Osnutek ni dovoljenje za računovodsko uporabo. Za pravo knjiženje bodo potrebni pravila po kontih, davčni kontekst, dokumentne povezave, identiteta odobritelja, sledljivost sprememb, atomarne transakcije, idempotenca, večpodjetna avtorizacija in strokovni računovodski QA.

Ciljni test: `node --test tests/next24SyntheticLedgerPreflight.test.mjs`. CI se sproži na PR samo ob spremembi ustreznih treh datotek. Brez strežniškega deploya.

**Omejitev infrastrukture:** FinAI je dovoljen samo v lastnem repozitoriju. Laškoteka, STNG, skupni uporabnik `laskot48`, cPanel in SSH ostanejo nedotaknjeni. Namestitev na Hiper M je do dokazano samostojnega OS/cPanel računa **NO-GO**.
