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

## Razvoj: sinhronizacija oken v uporabniški profil (PROFILE-SYNC-01)

Pripravljena je prva implementacija **za prihodnji izolirani FinAI backend**:
- `GET/PUT /api/companies/{companyId}/my/adaptive-views/{moduleKey}?view=...` shranjuje nastavitve `level`, `arrangement`, `detailWidth` in `textScale` v že obstoječi tabeli `workspace_layouts`.
- Identiteta uporabnika izhaja iz prijavljene seje, podjetje se preveri s `company.access`, ime modula je omejeno na registrirane module in podpogled na kontrolirano dolžino. Strežnik preveri obseg nastavitev in `expected_version`; spremenjena druga seja vrne **409** brez prepisa.
- V brskalniku se ob prisotnem **preverjenem** `NEXT_PUBLIC_FINAI_API_BASE_URL` najprej poskusi pobrati uporabniški profil; ob nedosegljivem API ostane lokalna nastavitev. Prikaz uporabnika jasno označi lokalno, sinhronizirano ali konfliktnost stanja.
- Statika in sintetični demo ostaneta **brez URL API** in zato lokalna. Tabela ne vsebuje računovodskih podatkov.
- Profilni API še ni objavljen, zato mednapravne sinhronizacije na `e-integrator.si` **ni dovoljeno označiti za aktivno**.

Povezava s prijavljeno sejo v produkciji je pogojena z ločenim FinAI gostovanjem, HTTPS, pravilnimi Sanctum first-party domenami, ustreznimi migracijami in ciljnim CSRF/2FA QA. Delno prilagajanje posameznih notranjih podoken je ločen prihodnji razvojni korak.
