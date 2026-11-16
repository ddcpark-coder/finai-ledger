# FinAI NEXT-13E — ročni pregled konfliktov mobilne šifrirane vrste

Samo sintetično, na localhost z aktivno testno sejo. V javnem predogledu so vse omrežne funkcije izključene.

- Nov postopek **Ročno preveri ujemanje konflikta** postane aktiven samo za lokalni šifrirani dogodek v stanju `conflict`, ko je na voljo omogočen lokalni testni API.
- Postopek uporabi samo **GET** za najnovejšo verzijo, preveri podjetje, dokument, `demo_only`, `real_sync_enabled=false`, enako **že opaženo** konfliktno strežniško verzijo in točno isto šifrirano ovojnico.
- Če se kopiji ujemata, ohrani izvirni UUID in ovojnico ter preide v lokalno končno stanje `matched`. To **ni** strežniška potrditev prenosa našega dogodka (`acknowledged`), zato sinhronizacije ne označujemo kot potrjeno. Ponovno pošiljanje ostane onemogočeno.
- Če sta šifrirani ovojnici različni, je drugačna verzija ali napačno podjetje, pregled zavrne poseg; konfliktni dogodek ostane nespremenjen za ročni izvoz/odstranitev po potrditvi uporabnika.
- Brez avtomatskega prepisovanja, združevanja računov, osebnih podatkov, shranjevanja gesel ali dostopa do produkcijskega strežnika.
- Ciljni Node testi preverjajo ujemanje, razliko, premik verzije, tuje podjetje, zavrnjene nepravilne odzive in ohranitev idempotentnega UUID. Playwright preverja, da javni offline PWA ne omogoči pregleda ali pošiljanja.

To je korak do uporabniško nadzorovane sinhronizacije, ne dokončana produkcijska sinhronizacija. Za pravo uporabo so potrebni avtorizirani strežniški acknowledgement protokol, identiteta več naprav, pravila konfliktov in trajni revizijski dnevnik.

FinAI se razvija samo v GitHub CI s sintetičnimi podatki. Laškoteka, STNG in skupni Hiper M račun `laskot48` so nedotakljivi.
