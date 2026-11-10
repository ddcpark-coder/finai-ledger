# FinAI e-računi — kontrola pripravljenosti metapodatkov (razvojna faza)

**Pravni kontekst:** ZIERDED (Uradni list RS 85/2025) določa začetek uporabe večine določb 1. januarja 2028 (28. člen), zgodnejši datum pa za določbe 4. poglavja. Uradni vir: https://www.gov.si/novice/2025-10-23-drzavni-zbor-sprejel-zakon-o-izmenjavi-elektronskih-racunov-in-drugih-elektronskih-dokumentov/

## Implementirano

V demonstracijskem modulu Izdani računi je možno pregledati osnovno popolnost metapodatkov za bodočo podporo eSLOG oziroma EN 16931 / PEPPOL. Preverijo se oznaka prejemnika/izdajatelja, identifikacijske številke, številka, datumi, opis, valuta in aritmetika zneskov v centih. Preverjanje vedno označi `productionReady:false`; potrdilo ali XML ni ustvarjeno.

Izdani računi in simulirane operacije so ločene po aktivnem podjetju, enako kot prej uvedeni prejeti računi in banka. Nastavitve razporeditve oken so na voljo prek skupnega modula za prilagodljivost.

## Ni implementirano / ni dovoljeno trditi

- Schema/semantic validation actual eSLOG 2.0, EN 16931 or PEPPOL BIS 3.0: **ni implementirana**.
- Elektronski podpis, izmenjava, registracija pri posredniku, UJP ali PEPPOL Access Point: **ni implementirano**.
- Resnični podatki, davčne potrditve, računovodske temeljnice, podpisovanje ali pošiljanje: **ni dovoljeno** do ciljnega QA, integracij in ločenega varnega gostovanja.

Naslednji korak: po uradni izbiri ponudnika e-poti dodati ločen certificiran XML validator/konverter, testne primere in idempotentno pošiljanje s sledljivimi statusi. Ne širiti demo checkerja v navidezno standardno skladnost.
