# FinAI Ledger — AI računovodski pomočnik v1

## Namen
FAZA 7 uvaja razložljiv hibridni sistem za predloge kontiranja. AI je pomočnik, ne računovodska avtoriteta.

## Viri signala
1. deterministična pravila podjetja;
2. pravila po partnerju;
3. potrjena zgodovina knjiženj;
4. podatki računa in ekstrakcije;
5. risk/anomaly signali.

## Prednost pravil
Deterministična računovodska in davčna pravila imajo vedno prednost pred statističnim/AI predlogom.

## Confidence policy
- >= 98 %: lahko je kandidat za avtomatizacijo samo, če pravilo izrecno dovoljuje avtomatizacijo in ni risk signala;
- 90–97.99 %: visoka gotovost, človeški pregled;
- 70–89.99 %: pregled;
- < 70 %: nizka gotovost;
- vsak risk signal prisili manual review.

To je produktna politika, ne pravna garancija.

## Razložljivost
Vsak predlog hrani:
- confidence;
- risk level;
- predlagane konte/DDV/stroškovno mesto;
- uporabljene signale;
- število preverjenih determinističnih pravil;
- količino uporabljene potrjene zgodovine;
- kratko razlago razloga.

## Učenje
Sistem se uči samo iz eksplicitnega feedbacka:
- accepted;
- modified;
- rejected.

Dogodki se zapisujejo v ai_learning_events. Originalni predlog ostane nespremenjen zaradi revizijske sledi.

## Anomalije
Prva različica podpira:
- nenavadno visok znesek glede na zgodovino partnerja;
- nizko OCR/extraction gotovost.

Kasneje:
- duplikati po vsebini;
- nenavadni DDV vzorci;
- nov/nenavaden IBAN;
- sprememba konta pri stabilnem dobavitelju;
- odstopanje od običajnega stroškovnega mesta;
- nenavadni datumi in plačilni pogoji.

## Varnost
- AI ne knjiži neposredno mimo PostJournal;
- AI ne odklepa obdobij;
- AI ne spreminja knjiženih temeljnic;
- AI ne sme sam povečati svojih pravic;
- produkcijski providerji in prompti ne smejo vsebovati skrivnosti;
- občutljivi podatki se ponudniku pošiljajo samo v obsegu, ki je nujen.

## Audit
Accepted/modified/rejected odločitev ustvari audit dogodek in učni dogodek.

## Naslednje
- rule builder UI;
- provider adapter in structured output schema;
- avtomatski predlog po vrsticah računa;
- human feedback analytics;
- testiranje precision/recall na anonimiziranem testnem naboru.
