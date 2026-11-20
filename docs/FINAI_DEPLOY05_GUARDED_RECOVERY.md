# FinAI DEPLOY-05 — priprava varnejšega prvega preklopa

Obseg: izključno FinAI, namenski račun `einteg86`. Te spremembe same **ne
namestijo** aplikacije in **ne dokazujejo** strežniške izolacije.

- Strežniški prehod in namestitveni skript zahtevata točno uporabnika
  `einteg86`, UID `1256` in dom `/home/einteg86`. To ni nadomestilo za
  potrditev dejanske OS/ACL izolacije pri ponudniku.
- Varovani preklop uporablja `finai:promote:v2:<pričakovani>:<novi>`.
  Znotraj zaklepa preveri, da se aktivna izdaja medtem ni spremenila. Stari
  neomejeni način `promote:v1` je zavrnjen. Pri nameščanju je zato treba
  uporabiti usklajeni različici prehoda in CI odjemalca; namestitveni skript
  ne prepiše tiho že nameščenega drugačnega prehoda.
- Če prva objava ali njen HTTPS pregled spodleti in je še vedno aktivna prav
  nova izdaja, `unpublish` odstrani samo kazalec `current` in vrne stanje
  brez aktivne izdaje. Če obstaja prejšnja izdaja, se pogojno vrne nanjo.
  Po povratku CI preveri kazalec. Ob nepričakovani izdaji ali nedostopnem
  strežniku prekine in zahteva ročno obnovo.
- Odstranitev `current` **ne** povrne spremembe nastavitev cPanel docroota
  ali njegove prvotne vsebine. Za to je še vedno potrebna preverjena
  obnovitvena točka in ločen načrt prvega preklopa.
- GitHub stage/publish zahtevata dodatno `FINAI_DEPLOY05_SERVER_READY=YES`,
  poleg obstoječih varovalk. Zastavice ne nastavljaj, dokler niso izpolnjeni
  in preverjeni vsi strežniški pogoji. `FINAI_APP_DOCROOT_CONFIRMED` ostaja
  izključen, dokler dejanska aplikacijska domena preverjeno ne streže
  pričakovane izdaje.

Pred dejansko namestitvijo so odprti: prijava v namenski cPanel; potrditev
izolacije s strani ponudnika; obstoj in izvedljivost obnove konkretne
obnovitvene točke; varen način povezave trenutnega app docroota
`/home/einteg86/app.e-integrator.si` z `finai-deploy/current`; preverba,
da ima spletni strežnik dostop do statičnih datotek ob obstoječih pravicah;
namestitev omejenega SSH ključa; namenski Laravel docroot in baza. Glavne
domene in drugih projektov se ta postopek ne dotika.
