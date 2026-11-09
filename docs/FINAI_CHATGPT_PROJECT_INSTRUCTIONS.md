# FinAI – navodila za ChatGPT Project (kopiraj v Project → Instructions)

1. **ABSOLUTNO PREPOVEDANO spreminjati Laškoteko** (`laskoteka.si`, `www.laskoteka.si`): noben FinAI pogovor, Work postopek ali agent ne sme spreminjati njene kode, datotek, podatkovnih baz, DNS, SSL, SSH ključev, cPanel nastavitev, cron, uporabnikov, medijev, varnostnih kopij ali produkcije. Prepoved velja tudi za posredne spremembe, skupne servise in `/home/laskot48/public_html`.
2. FinAI ne sme spreminjati STNG ali drugih projektov. Vsa pisalna dejanja so omejena izključno na FinAI.
3. Spletna produkcija FinAI je na Hiper M; Vercel ni produkcijsko okolje. `app.e-integrator.si` se ne povezuje z Vercelom.
4. Namizna aplikacija za Windows mora biti samostojna, namestljiva in uporabna brez interneta; uporablja lokalno šifrirano bazo in ne potrebuje Hiper M za zagon.
5. Za produkcijo FinAI zahtevaj lasten, fizično/logično ločen Hiper M cPanel/OS račun, ločeno podatkovno bazo, SSH, datotečne pravice in obnovitvene kopije. Skupni `laskot48` račun je za FinAI **read-only**, nikoli pisalna avtomatizacija.
6. V FinAI ne spreminjaj **nobenih obstoječih SSH ključev ali `authorized_keys`** na skupnem računu. Za FinAI uporabi poseben Ed25519 ključ samo v preverjenem ločenem računu.
7. »Izvedi« pomeni nadaljevanje razvoja in testov z razpoložljivimi orodji brez nepotrebnih vprašanj, ne pa dovoljenja za obhod varnostnih zaščit ali spremembo drugih projektov.
8. Razvoj: ločena GitHub veja → najmanjši relevantni testi → pregled rezultatov → združitev → po pripravi ločenega računa varovan staging.
9. Produkcijski preklop zahteva uspešne teste, točno določeno izdajo SHA256, preverjen HTTPS in obnovitveno točko; preklop naj bo atomaren in povrnljiv.
10. Skrivnosti, SSH zasebne ključe, baze in gesla hrani samo v varovanih GitHub/Hiper M nastavitvah. Nikoli jih ne objavi v klepetu, datotekah repozitorija ali dnevnikih.
11. Pred vsakim pisanjem na gostovanje preveri identiteto uporabnika, lastništvo, dejansko pot, odsotnost symlink prehodov in ločenost od Laškoteke; ob negotovosti piši samo v GitHub, ne na strežnik.
12. Vse nove računalniške in računovodske funkcije naj bodo offline-first, s strogo izolacijo podjetij, nespremenljivo revizijsko sledjo in preverljivimi računovodskimi pravili.
13. Resnični finančni in osebni podatki so prepovedani, dokler niso potrjeni šifriranje, prijava, prenosna obnova, varnostni QA, zakonitost RS/EU in pravilnost knjiženja.
14. Testiraj samo spremembe in funkcije, ki to zahtevajo; ne ponavljaj nepotrebnih zgodovinskih testov in ne spreminjaj nobene produkcije drugih projektov.
15. Če predpisana izolacija, ključ ali dovoljenje manjka, ustavi samo nevarni del naloge, poročaj o natančnem blockerju in nadaljuj dovoljeno GitHub razvojno delo. **Nikoli ne uporabi Laškoteke kot nadomestnega okolja.**

## Obvezna uvodna vrstica za nove Work naloge

»Delo velja IZKLJUČNO za FinAI / e-integrator.si. Spreminjanje Laškoteke v kakršnikoli obliki je strogo prepovedano, prav tako spreminjanje STNG ali skupnih cPanel/SSH nastavitev. Na računu laskot48 je dovoljen samo FinAI read-only pregled. Vse pisalne objave zahtevajo ločen namenski Hiper M račun za FinAI. Nadaljuj z dovoljeno implementacijo in minimalnim testiranjem; ob varnostni blokadi se ustavi in poročaj.«
