# FinAI Ledger — Partnerji v1

## Namen
FAZA 5 uvaja centralni register poslovnih partnerjev, ki ga uporabljajo računi, saldakonti, banka, DDV in kasneje e-računi.

## Entitete
- Partner
- PartnerAddress
- PartnerContact
- PartnerBankAccount
- PartnerAccountMapping

## Partner
Partner je vedno vezan na company_id. Podprti tipi:
- company
- sole_trader
- individual
- public_entity

Osnovni podatki:
- naziv in kratki naziv
- matična/registrska številka
- davčna številka
- VAT ID
- država
- valuta
- plačilni rok
- status
- risk level
- čas zadnjega preverjanja, rezultat in vir verifikacije

## Saldakonti
JournalEntry in OpenItem imata partner_id. To omogoča:
- odprte terjatve/obveznosti po partnerju;
- kasnejše avtomatsko zapiranje;
- partnerjev saldo;
- starostno strukturo terjatev.

PartnerAccountMapping omogoča privzeti konto terjatev in obveznosti po partnerju.

## Bančni računi
IBAN-i so ločena entiteta. Audit log ne hrani celotnih občutljivih podatkov v metadata; za dodan IBAN beleži samo zadnje štiri znake.

## Verifikacija
Integracijska sloja sta namerno definirana kot interface:
- PartnerRegistryVerifier — slovenski poslovni register / drug register;
- VatNumberVerifier — VAT/VIES preverjanje.

FAZA 5 ne simulira produkcijske verifikacije. Dejanski ponudnik in pogodbeni/API pogoji se konfigurirajo ločeno. Sistem loči čas zadnjega preverjanja od rezultata (`verified` / `review` / `unverified`).

## Kontrole
- ime partnerja je obvezno;
- country_code mora biti ISO alpha-2;
- plačilni rok je omejen;
- davčna/VAT številka se normalizira;
- znotraj podjetja se prepreči očiten duplikat davčne številke;
- IBAN se normalizira in osnovno formatno validira;
- partner se ne briše fizično, ko že sodeluje v finančni zgodovini; uporablja se arhiviranje/status.

## Naslednje
- Partner FK na izdane/prejete račune;
- AJPES/VIES produkcijski adapter;
- UJP/poslovni računi po potrebi;
- merge duplikatov;
- kreditni limiti;
- avtomatski risk signali;
- starostna struktura saldakontov.
