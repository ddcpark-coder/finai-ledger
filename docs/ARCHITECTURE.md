# FinAI Ledger — tehnična arhitektura v1

## 1. Cilj
Komercialna računovodska SaaS aplikacija za slovenski trg, primarno gostovana na Hiper M, z možnostjo self-hosted distribucije.

## 2. Potrjeni produkcijski stack
- Backend: Laravel 13, PHP 8.4
- Baza: MariaDB 10.11
- Frontend: ločen UI sloj; trenutni Next.js MVP ostane referenčni UI prototip/preview
- Asset build: Node.js samo za build frontend sredstev
- Git: GitHub
- Primarna produkcija: Hiper M
- Preview: Vercel
- Self-hosted: ista aplikacijska koda, druga okoljska konfiguracija

## 3. Sloji
1. Presentation/UI
2. Application services / use cases
3. Domain — računovodska pravila
4. Persistence — MariaDB/repositories
5. Integrations — FURS, banke, AJPES, e-računi, AI/OCR
6. Jobs — asinhrona in periodična opravila
7. Audit/Security — revizijska sled, pravice, podpisovanje

## 4. Ključna načela
- UI ne vsebuje računovodskih pravil.
- Controllerji ne vsebujejo poslovne logike.
- Zunanje integracije imajo adapterje in lastne testne/produkcijske konfiguracije.
- Multi-tenant podatki so vedno vezani na tenant/company ID.
- Vsaka finančno pomembna sprememba je revizijsko sledljiva.
- FURS certifikati in skrivnosti so samo v varnem okolju, nikoli v repozitoriju.
- Težka obdelava dokumentov se izvaja izven request/response cikla.

## 5. Predlagana struktura backend kode
```
app/
  Domain/
    Accounting/
    Invoicing/
    Tax/
    Banking/
    Partners/
    Documents/
  Application/
    Actions/
    DTO/
    Services/
  Infrastructure/
    Persistence/
    Integrations/
    AI/
    Storage/
  Jobs/
  Http/
```

## 6. Multi-tenant model
Začetna strategija: ena baza, skupne tabele, obvezni `company_id`/tenant scope. Izolacija se uveljavlja v aplikacijskem in podatkovnem sloju. Kasnejši prehod na ločene baze mora ostati mogoč.

## 7. Background jobs
Hiper M nima potrjenega trajnega workerja, zato osnovni model uporablja DB queue + periodični cron dispatcher. Dolgotrajni OCR/AI procesi so zasnovani kot zamenljiv zunanji worker/provider.

## 8. Storage
Dokumenti niso shranjeni v DB. Baza hrani metapodatke in reference. Storage mora podpirati lokalni filesystem Hiper M in self-hosted volume/object adapter.

## 9. API
Interni API je verzioniran. Integracijski endpointi so ločeni od UI endpointov. Vhodni podatki se validirajo, idempotency se uporablja pri plačilih in FURS/e-računih.

## 10. Faza 1 rezultat
Arhitektura, deployment model, konfiguracijski kontrakt in projektna pravila so potrjeni. Implementacija poslovnih modulov sledi v naslednjih fazah.
