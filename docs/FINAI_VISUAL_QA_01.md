# FinAI – VISUAL-QA-01 (9. 11. 2026)

## Namen

Omogočiti takojšnje testiranje **obstoječega FinAI spletnega vmesnika** in podajanje konkretnih vizualnih pripomb za posamezen modul, še preden bo na voljo ločen Hiper M račun za produkcijo.

### Trenutno resnično stanje gostovanja

- `https://e-integrator.si/` na Hiper M prikazuje **predstavitveno stran**, ne celotnega FinAI delovnega prostora. Bralni pregled javne strani je potrdil predstavitvene (sintetične) številke in oznako `noindex,nofollow,noarchive`.
- `app.e-integrator.si` nima potrjenega pravilnega Hiper M DNS/docroot in ni dosegljiva testna aplikacija.
- Obstoječi Hiper M račun `laskot48` je skupen z Laškoteko. **V okviru FinAI je dovoljen samo read-only pregled; prepovedani so kakršnikoli pisalni posegi na gostovanje, DNS, cPanel, SSL, SSH ali skupne servise**.
- Odprtje ločenega Hiper M računa je načrtovano **pred javno produkcijo**. Ne zahtevati ga pri vsakem nadaljnjem razvojnem koraku.

## Kaj je mogoče preizkusiti takoj

1. **Zaščiten razvojni spletni predogled** na že obstoječem Vercel projektu `finai-ledger` (*izključno predogled, ne produkcija, ne `app.e-integrator.si`*); SSO je nastavljena na `all`. V predogledu so samo sintetični podatki. Uporabi neposredno povezavo do uspešne izdaje veje `ux-visual-qa-review-01`, ko je `READY`.
2. **GitHub Actions desktop/mobile posnetki zaslonov**. Workflow `browser-qa.yml` samodejno preveri novo demonstracijsko oznako in pripombe ter objavi artefakt `finai-visual-qa-desktop-mobile`: osnovni zaslon in način podajanja pripomb, ločeno za 1440px desktop in mobilni prikaz.
3. **Windows offline testna aplikacija**. Workflow `finai-hiperm-desktop-build.yml` ostaja ločen paket. Dokler celotno računovodstvo in prijava niso varnostno preverjeni, uporabiti samo demonstracijske podatke.
4. **Uporabniški pregled**: preveri preklop temna/svetla, kompaktno/udobno, navigacijo med moduli in podpogledi, kartice na nadzorni plošči ter odzivnost na manjših zaslonih.

## Pripombe brez dodatne integracije

Na vsakem zaslonu je zdaj jasno označen `FINAI · DEMONSTRACIJSKA IZDAJA`. Gumb **»Pripomba o zaslonu«** odpre okno s poljem za tvojo spremembo in samodejno izpolni ime modula, podpogled, temo in gostoto prikaza.

Klikni **»Kopiraj za ChatGPT«** in poročilo prilepi v ta klepet. Poročilo se **ne pošilja** na strežnik ali v drugo aplikacijo. Če brskalnik prepove clipboard, je besedilo na voljo za ročno kopiranje v polju predogleda.

Primer:

```
FinAI – vizualni pregled (izključno demonstracija)
Modul: Prejeti računi
Podpogled: Pregled / Vsi računi
Tema: temna
Gostota: udobna
Pripomba: Povečaj višino vrstice in poudari akcijo za pregled.
```

## Kako spravimo celoten FinAI na Hiper M

Za objavo `app.e-integrator.si` na Hiper M je potreben **ločeno preverjen FinAI OS/cPanel račun**, svoj docroot, neodvisen SSH/GitHub dostop, varno staging okolje in TLS. Ta korak je odložen do predprodukcijske faze po potrjenem načrtu. Razvojni pregled se zato ne bo nikoli zanašal na pisanje v skupni `laskot48` račun.

**Niti vizualni predogled niti CI ne smeta spremeniti Laškoteke ali STNG.** Ne dodajaj CNAME na Vercel za `app.e-integrator.si`. Resnični finančni in osebni podatki so prepovedani.
