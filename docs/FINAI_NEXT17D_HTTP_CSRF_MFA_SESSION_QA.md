# FinAI NEXT-17D — dejanski lokalni HTTP QA sej, CSRF, MFA in izolacije mobilnih dokazil

## Kaj se preverja

GitHub Actions zažene samo na izoliranem Ubuntu runnerju lastni Laravel testni strežnik **127.0.0.1:8765**, novo začasno SQLite bazo v `RUNNER_TEMP` in dve ločeni HTTP cookie seji. Vsi uporabniki, podjetje, dostopna fraza, dokumenti in ovojnice so izmišljeni.

1. **CSRF**: dostop do `/sanctum/csrf-cookie` ter dejanski odgovor 419 na POST prijave oziroma oddaje šifrirane testne dobavnice brez `X-XSRF-TOKEN`. Z veljavno sejo in CSRF žetonom se testni zapis sprejme; ponovljeni UUID dobi idempotentno potrditev.
2. **Neodvisnost sej**: neprijavljena druga naprava ne vidi šifriranih dogodkov prve. Po prijavi z drugim računom v istem sintetičnem podjetju ne more pridobiti prvega uporabnikovega AES-GCM paketa.
3. **Fortify MFA**: vloga lastnika z vnaprej potrjenim testnim TOTP izvede geselno prijavo, ki še ne omogoči API-ja, nato zavrnjen napačen OTP, šele nato veljaven OTP omogoči dostop.
4. **Živa revokacija**: ločen CI-only proces suspendira članstvo lastnika v testni bazi. Obstoječa seja ne more več niti brati niti zapisovati šifriranega testnega dokumenta. Druga seja ostane veljavna.
5. **Odjava**: po odjavi obeh odjemalcev test zavrne vsak poskus nadaljnjega branja/oddaje s starimi sejami.

## Varnost izvedbe

- `Next17dHttpSeed.php` zavrne vsak zagon zunaj `GITHUB_ACTIONS=true`, `CI=true`, `APP_ENV=testing` in **prazne SQLite baze znotraj RUNNER_TEMP**. Nima možnosti pisanja v Hiper M.
- Začasna sintetična TOTP skrivnost obstaja samo v runnerjevem zasebnem direktoriju, `chmod 0600`; testi ne zapisujejo gesel, piškotkov, TOTP vrednosti ali celotnih odgovorov v CI log.
- Workflow vzpostavi le identitetno in sintetično migracijo. Brez produkcijske baze, pravih oseb ali računovodskih knjižb.
- Sistem uporablja standardno HTTP cookie/CSRF preverjanje Laravela in Fortifyja, ne pa API tokenov ali obvoda TOTP.
- Testna aplikacijska zastavica za sinhronizacijo je vključena **samo med tem CI testom**.

## Meje

Gre za end-to-end lokalno HTTP preverjanje sej v enem CI okolju, **ne za poskus na dveh fizičnih telefonih**, ne za potrditev produkcijskega HTTPS/cookie okolja in ne za varnostno odobritev obdelave resničnih poslovnih podatkov. Naslednje je test z dvema dejanskima testnima napravama in samostojnim FinAI okoljem. Prepoved spreminjanja Laškoteke, STNG in skupnega sistemskega računa `laskot48` ostaja absolutna.
