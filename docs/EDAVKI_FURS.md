# FinAI Ledger — eDavki / FURS integracija v1

## Namen
FAZA 11 uvaja varno integracijsko plast za elektronsko davčno poslovanje z eDavki/FURS.

## Uradna izhodišča preverjena 3. 11. 2026
eDavki uradno ponujajo SOAP spletne storitve za povezavo računovodskih sistemov s FURS. Podprti so prenos dokumentov, avtomatska oddaja podpisanih dokumentov ter dostop do statusov oddanih dokumentov.

Uradna SOAP endpointa:
- TEST / Peskovnik: https://beta.edavki.durs.si/SoapPortal/EdpSoapService.asmx
- PRODUKCIJA: https://edavki.durs.si/SoapPortal/EdpSoapService.asmx

Tehnične zahteve vključujejo XML, XML Schema, SOAP/WSDL, XML Signature in spletno digitalno potrdilo.

## Okolja
TEST in PRODUKCIJA sta fizično in logično ločena.
- profil vsebuje environment;
- submission vsebuje environment;
- okolji se morata ujemati;
- endpoint je izpeljan iz enum TaxEnvironment in ga uporabnik ne podaja poljubno;
- TEST dokument ne more biti poslan na produkcijski endpoint in obratno.

## Certifikati
Baza ne hrani zasebnega ključa ali gesla certifikata.
TaxIntegrationProfile hrani samo:
- certificate_reference;
- fingerprint;
- veljavnost.

certificate_reference kaže na varen server-side secret/certificate store.

## XML
Pred oddajo:
1. exporter ustvari XML po konkretni aktualni shemi obrazca;
2. XmlSchemaValidator preveri XSD;
3. XmlDocumentSigner doda XML Signature;
4. EdavkiSoapClient pošlje podpisan dokument.

## Idempotenca
PrepareTaxSubmission iz company + document type + source + environment + artifact SHA-256 izdela idempotency_key.

Ponovljen klic z istim artefaktom vrne isti submission in ne ustvari nove davčne oddaje.

## Statusi
Lokalni statusi:
- prepared
- validated
- queued
- submitted
- processing
- accepted
- rejected
- failed

Remote status se vedno hrani ločeno, da ne izgubimo originalnega odgovora FURS.

## Retry
Omrežna/začasna napaka se lahko ponavlja z backoffom:
1 min -> 5 min -> 15 min -> 1 h -> 6 h.

Največ 8 poskusov brez ročnega posega.

Davčno zavrnjen dokument se ne pošilja avtomatsko znova brez odprave vsebinske napake.

## Audit in varnost
- oddaja ustvari audit dogodek;
- vsi poskusi se evidentirajo;
- statusne spremembe so zgodovinske;
- SOAP odgovor se v bazo shrani samo kot varni metadata subset;
- zasebni ključ, password/PIN in celotni podpisani XML niso zapisani v audit metadata;
- produkcijsko aktivacijo mora opraviti privilegirana vloga.

## Dokumentne sheme
eDavki objavlja XML/XSD strukture po posameznih obrazcih in verzijah. FinAI zato ne hardkodira ene globalne davčne sheme; schema registry/exporter mora izbrati pravilno različico glede na tip dokumenta in poslovno obdobje.

## Naslednje
- konkretna SOAP implementacija;
- certificate store na Hiper M/self-hosted okolju;
- schema registry za DDV-O/RP-O;
- eDavki testni certifikat in sandbox E2E test;
- podpisani submission E2E;
- produkcijska aktivacija šele po uspešnem sandbox QA.
