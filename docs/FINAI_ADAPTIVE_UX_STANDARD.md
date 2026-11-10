# FinAI UX — prilagodljivost za vsako stopnjo računalniškega znanja

## Trajna funkcionalna zahteva

Uporabnik mora imeti v vsakem poslovnem modulu in podpogledih dostop do nastavitev:
- **Osnovno**: pregleden potek z manj sekundarnimi informacijami.
- **Običajno**: vsakodnevno delo z običajno količino informacij.
- **Napredno**: celoten računovodski/tehnični kontekst.
- Razporeditev **dve okni / navpično / samo seznam / samo podrobnosti**.
- Nastavitev širine desnega podrobnega okna (260–700 px) in velikost prikaza (100, 115, 130 %).
- Ponastavitev pogledov brez izgube transakcij ali podatkov.
- Prednastavitve so ločene na ravni **podjetje + modul + podpogled** v lokalnem demonstracijskem brskalniku, pripravljene za kasnejši strežniški profil.

Nastavitve vplivajo na prikaz, ne na uporabnikova dovoljenja, validacijo, revizijo ali DDV izračune. Mobilni prikaz ohranja navpično postavitev in dostop do upravljanja zahtevnosti.

## Trenutna implementacija

Skupni `AdaptiveWorkspace` je že povezan z vsemi glavnimi moduli FinAI. Podpira standardizirane večokenske strukture; nadzorna plošča dodatno omogoča urejanje kartic, velikosti in vrstnega reda.

**Še ni dokončano:** posamično premikanje vsakega notranjega podokna/dialoga, uporabniško ustvarjene plošče, mednapravna sinhronizacija nastavitev, dostopnost z bralniki zaslona po celotnem programu in napredne uporabniške profile po vlogah. Nobene od teh funkcij ne smemo označiti kot zaključene brez implementacije in ciljnega QA.

## Naslednji razširitveni koraki

1. Potrditev konfiguracije razporeditve vsakega gnezdenega okna/detajlnega panela in shranjevanje po podjetju, podmodulu in uporabniku.
2. Preglednost: semantična imena polj, razlaga računovodskih izrazov, vodeni postopki, zmanjšanje števila klikov, uvozi z jasnimi napakami.
3. Povezava s prijavljenim uporabniškim profilom prek izoliranega API-ja s kontrolami verzij in pravicami.
4. Ciljni dostopnostni QA: tipkovnica, povečava, širine oken, mobilni zaslon, kontrast in bralniki zaslona.

Do dokazane varne namestitve ostaja lokalni prikaz sintetičen; produkcija na Hiper M ni objavljena.
