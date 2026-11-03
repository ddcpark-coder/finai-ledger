# FinAI Ledger — Dokumentni sistem in elektronske dobavnice v1

## Namen
FAZA 12 uvaja centralno, varno hrambo dokumentov in elektronske dobavnice s podpisom na mobilni napravi.

## Dokumentni sistem
DocumentRecord je centralni register datotek:
- company_id
- document_type
- title
- storage reference
- MIME
- size
- SHA-256
- version
- status

DocumentLink omogoča povezavo dokumenta z:
- prejetim računom
- izdanim računom
- partnerjem
- temeljnico
- bančno transakcijo
- DDV obračunom
- dobavnico
- drugimi bodočimi entitetami

## Varni download
Datoteke nimajo trajnega javnega URL-ja.
SecureDocumentStore izdela časovno omejen download URL po avtorizaciji.

Vsak dostop se lahko zabeleži v document_access_logs.

## Elektronska dobavnica
DeliveryNote:
- partner
- številka
- datum dostave
- prejemnik
- e-mail
- naslov dostave
- postavke
- status

DeliveryReceipt hrani dokaz prevzema.

## Podpis na telefonu/tablici
Podprta sta dva načina:

### 1. Drawn signature
Stranka se podpiše s prstom ali pisalom neposredno na zaslonu.
Sistem shrani:
- podpis
- SHA-256 podpisa
- ime podpisnika
- čas podpisa
- IP
- device info
- po potrebi lokacijo

To je dokaz prevzema in audit paket, vendar ga ne smemo predstavljati kot kvalificiran elektronski podpis.

### 2. Qualified signature
Za procese, kjer se zahteva višja pravna zanesljivost, je predvidena integracija s SI-PASS oziroma drugim kvalificiranim ponudnikom.

SI-PASS omogoča podpisovanje dokumentov tudi na pametnem telefonu ali tablici.

## PWA pristop
Za prvo produkcijsko različico priporočamo responsive PWA:
- Android Chrome
- iPhone/iPad Safari
- namestitev na začetni zaslon
- kamera
- touch/pencil signature pad
- offline osnutek in kasnejša sinhronizacija
- brez ločenega razvoja dveh native aplikacij

Native Android/iOS aplikaciji sta smiselni šele, če pozneje potrebujemo globlji offline način, background sync, NFC ali drugo funkcionalnost, ki je v PWA omejena.

## Zaključek dobavnice
Ob podpisu:
1. validira se dobavnica;
2. shrani se receipt/audit dokaz;
3. generira se finalni PDF;
4. PDF se shrani kot immutable DocumentRecord;
5. dobavnica dobi status completed;
6. pošlje se e-mail kopija prejemniku;
7. celoten dogodek se zabeleži v audit trail.

## Elektronska hramba
ZEPEP dopušča elektronsko hrambo, če so podatki dostopni za kasnejšo uporabo, verodostojno ohranjeni in je mogoče ugotoviti izvor, prejemnika ter čas pošiljanja/prejema, uporabljeni postopki pa morajo omogočati zaznavo sprememb.

Zato finaliziranih dokumentov ne prepisujemo; sprememba pomeni novo verzijo ali nov dokument.

## Zasebnost
Lokacija je opcijska in se zbira samo, če je za proces dejansko potrebna in ustrezno pojasnjena uporabniku.
Podpis in osebni podatki se obravnavajo kot osebni podatki.

## E-pošta
DocumentMailer pošilja finalni PDF kupcu.
Status pošiljanja se evidentira v document_deliveries.

## Naslednje
- pravi signature pad UI
- kamera/fotografija dostave
- offline PWA queue
- QR/link za podpis kupca brez prijave
- tokeniziran varen podpisni link
- SI-PASS qualified signature adapter
- retention policies
- legal hold
- versioning UI
