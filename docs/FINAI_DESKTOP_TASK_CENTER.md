# FinAI DESKTOP-TASKS-01 — pregledna osebna delovna vrsta

**Namen:** v glavnem namiznem pogledu in na telefonu ponuditi razumljiv seznam odprtih demonstracijskih opravil, brez lažnega samodejnega potrjevanja poslovnih zapisov.

## Implementirano
- Nadzorna plošča → **Pregled / Moj pregled**: kratek seznam največ treh prioritetnih opravil.
- Nadzorna plošča → **Moje naloge / Danes, Ta teden, Zamujeno**: celoten interaktivni seznam z iskanjem, filtri in statusom.
- Uporabnik lahko odpre pravi poslovni modul in vadi označevanje opravljenosti, ki **ne odobri računa, ne knjiži, ne potrdi dobavnice in ne pošlje e-pošte**.
- Opravljenost se začasno shrani v `sessionStorage` **posameznega sintetičnega podjetja**; uporabnik se po osvežitvi v istem zavihku vrne na svoj demo seznam.
- Vsi roki so prikazani kot demonstracijski, da se ne zamenjajo s pravimi računovodskimi roki.
- Posebna mobilna postavitev ohrani naslov naloge in dejanja brez vodoravnega pomikanja.

## Nadaljnja produkcijska faza
Resnična delovna vrsta mora izhajati iz avtoriziranega API, povezati dejanska dovoljenja, pooblastila, podpisnike, opomnike, roke in revizijo. Opravljenost mora biti odvisna od dejanskega poslovnega dogodka, ne od lokalnega gumba. Po izolirani FinAI namestitvi se vključijo osebna nadomestila, delegiranje in potisna obvestila.
