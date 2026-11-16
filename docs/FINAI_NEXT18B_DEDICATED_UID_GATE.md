# FinAI NEXT-18B — zaščita namenskega gostovalnega računa pred UID aliasom

## Sprememba

Za prisilno omejeni FinAI SSH prehod je dodano preverjanje **dejanske sistemske identitete**, ne le uporabniškega imena:

- Priprava, prenos ali preklop izdaje se zavrnejo, če je UID nič, ime `root` ali `laskot48`, ali če se UID navidezno ločenega FinAI uporabnika **ujema s sistemskim UID računa `laskot48`**.
- Domača mapa mora biti samostojna navadna mapa, ne simbolna povezava, v lasti dejanskega FinAI UID in brez skupinskega ali javnega pisanja.
- Korenski direktorij `finai-deploy` mora biti navadna, namenska in zasebna mapa v lasti FinAI UID; simbolne povezave in skupinsko/javno pisanje so blokirani.
- Obstoječi SHA256 gate, pregled vsebine arhiva, omejeni SSH ukazi, izrecni produkcijski markerji in obnovitveni postopek ostanejo nespremenjeni.

## Izolirani QA

Sintetični testi `tests/test_finai_isolated_ssh_gate.py` preverijo zavrnitev istega UID pod drugim imenom, sistemskega uporabnika root/laskot48, skupinsko odprtega doma in simbolnih povezav. Izvajajo se v GitHub Actions brez stika z gostovanjem.

## Pomembna meja

**Različen UID je samo nujni, ne zadostni dokaz izolacije.** Pred kakršnimkoli pisanjem na Hiper M ostajajo obvezni ločen preverjen cPanel/OS račun za FinAI, lastna podatkovna baza in DB uporabnik, preverjanje dejanskih ACL/mount/deljenih storitev, lastni ključi, HTTPS, varnostna obnovitvena točka, revidirana izdaja, SHA256, najmanjši cilj testov in atomaren povrnljiv preklop. Ta PR ne omogoči deploya, ne spreminja SSH ključev ali nastavitvenih zastavic in ne odobri produkcije.

Račun `laskot48` ostaja FinAI read-only. Laškoteka, STNG in njune datoteke/baze niso predmet pregleda ali spreminjanja.
