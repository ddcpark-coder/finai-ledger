# FinAI Ledger — Workspace personalizacija

## Cilj
Glavni pogled ni fiksen. Vsak uporabnik lahko določi, katere informacije vidi, v kakšnem vrstnem redu in velikosti.

## MVP funkcije
- dodajanje in skrivanje widgetov;
- drag & drop vrstni red;
- velikosti S / M / L / XL;
- prednastavitve: Podjetnik, Računovodja, DDV, Likvidnost;
- ponastavitev na privzeti pogled;
- lokalno shranjevanje postavitve za demo uporabnika;
- responsive prilagoditev widgetov.

## Produkcijski model
Postavitev se bo shranjevala v bazo po uporabniku in podjetju.

Predlagan koncept:
- user_id
- company_id
- workspace_key
- layout_json
- version
- updated_at

## Pravila
- obvezni sistemski opozorilni widgeti se kasneje ne smejo skriti, če to zahteva skladnost ali varnost;
- uporabniška postavitev ne spreminja računovodske logike;
- admin lahko določi privzete predloge;
- uporabnik lahko vedno obnovi privzeto postavitev;
- mobilna postavitev je lahko ločena od desktop postavitve.

## Prihodnja razširitev
- več imenovanih workspace pogledov;
- deljenje predlog med uporabniki;
- zaklep widgetov po vlogah;
- widget permissions;
- widget marketplace / dodatni moduli.
