# FinAI FTPS – DNS in TCP/21 iz GitHub okolij, 10. 11. 2026

**Namen:** ugotoviti, zakaj samodejna FinAI objava prek namenskega FTPS ne more vzpostaviti povezave na Hiper M. **Noben FTP login, prenos, zapis, sprememba DNS/cPanela/SSH ali drugih projektov ni bil izveden.**

## Dejanska dokazila

- [Ponovljeni AUTH TLS preflight #42780150310](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42780150310), ponovitev 10. 11. 2026: `FINAI_FTPS_DIAGNOSTIC=CONNECT_TIMEOUT`, 12 sekund, pred TLS/FTP prijavo.
- [Neavtenticirana primerjava iz Linux in Windows GitHub runnerja #42789871954](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42789871954):
  - `ftp.laskoteka.si` → A `212.44.112.125`; TCP/21 `TIMEOUT` iz Linux **in** Windows; IPv6 naslov ni vrnjen.
  - `hcp-30.controlpanel.si` → A `212.44.112.125`; TCP/21 `TIMEOUT` iz Linux **in** Windows; IPv6 naslov ni vrnjen.
  - Preverjanje je bilo omejeno na javni DNS in kratko TCP povezavo na vrata **21**. Ni poskusilo FTP ukazov, prijave ali prenosa.
  - GitHub job `success` pomeni, da se je **diagnostika uspešno izvedla**, ne da je bila FTP povezava uspešna. Dejansko TCP omrežje je **NEUSPEŠNO**.
- Zato ni dokaza o FTPS/TLS certifikatu, FTP virtualni izolaciji, pasivnih vratih ali možnosti samodejne namestitve.

## Kaj pomeni ta rezultat

Oba naslova razrešujeta na isti IPv4, pri obeh GitHub OS okolij ni uspešnega TCP handshake na 21. Ni dokaza o napaki DNS ali težavi IPv6 na GitHub izvajalniku. Potrebna je diagnostika ponudnika glede vhodnega firewall/IP filtriranja, FTP poslušalca, routing/NAT in morebitne omejitve izhodnega prometa izvajalnikov.

## Najmanjši neinvazivni preizkus na lokalnem uporabnikovem Windows računalniku

V PowerShell brez administratorja:

```powershell
Test-NetConnection ftp.laskoteka.si -Port 21
```

- `TcpTestSucceeded : True`: lokalno omrežje je povezljivo, medtem ko GitHubovo ni; smiselna primerjava zunanjih IP pravil.
- `TcpTestSucceeded : False`: vrata niso dosegljiva niti z lokalnega omrežja, zato naj ponudnik preveri naslov, požarni zid in delovanje FTP daemon-a.
- To **še ne preveri TLS certifikata, FTP-jaila ali pisalnih pravic**. Gesla ne vnašaj v PowerShell ali klepet.

## Kratko sporočilo podpori Hiper M

> Naš cPanel za namenski račun `finai-deploy@e-integrator.si` navaja FTP/explicit FTPS `ftp.laskoteka.si:21`. Iz GitHub Actions Windows in Linux je DNS uspešen (oba `ftp.laskoteka.si` in `hcp-30.controlpanel.si` → `212.44.112.125`), vendar vsi TCP/21 preizkusi zaključijo s `TIMEOUT`. Prosimo, preverite stanje FTP poslušalca, požarni zid/IP omejitve do GitHub-hosted izvajalnikov, usmerjanje in primeren varen FTPS naslov z veljavnim TLS certifikatom. Ne spreminjajte nobenih nastavitev Laškoteke ali STNG. Če je potreben allowlist, prosimo za ozko omejen rešitev, ne splošno odpiranje skupnih storitev.

## Meja objave

Za FinAI še vedno velja `laskot48` **read-only** skladno z `docs/FINAI_CHATGPT_PROJECT_INSTRUCTIONS.md`. Uporabnikov novi FTP račun je ponudnikov mapno omejen virtualni račun pod istim cPanel OS uporabnikom, kar **ne dokazuje ločene sistemske izolacije**. Ne vklapljaj `FINAI_STAGE_ENABLED` ali pisalnega transporta. GitHub gradnja, varnostni testi, priprava SHA256 izdaj in sintetični UX predogled lahko nadaljujejo neodvisno.
