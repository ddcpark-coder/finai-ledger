# FinAI NEXT-01 — sintetični proces do plačila

Povezan voden **demonstracijski** tok vključuje:

Ponudba → sprejem ponudbe → naročilo → dobavnica → priprava računa → *simulirana potrditev plačila v modulu Banka*.

- Zaključen račun ima stanje **»plačilo še ni potrjeno«**, dokler uporabnik v banki eksplicitno ne izbere **Potrdi sintetično plačilo**.
- Gre le za preverjeno zaporedje šestih demonstracijskih prehodov, ne dejansko ujemanje s prejetim nakazilom, ne knjigovodsko knjiženje ali posodobitev stanja računa.
- Vrstni red in ločitev po podjetju se preverita z rekonstrukcijo dovoljenih dogodkov v brskalniški seji.
- Naslednji resnični korak po uvedbi varnega FinAI backenda: vezava dogodkov na ID transakcije, znesek v centih, variabilne reference, usklajevanje delnih plačil in revizijsko odobritev, brez avtomatiziranega potrjevanja samo na podlagi navedbe uporabnika.

Minimalni QA: `node --test tests/demoCommercialFlow.test.mjs` in en browser test, ki preveri prehod od ponudbe do banke ter preklop podjetja. Samo sintetični podatki; brez pisanja na skupni Hiper M.
