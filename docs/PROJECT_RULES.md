# FinAI Ledger — projektna pravila

1. GitHub je edini vir resnice za izvorno kodo.
2. `main` predstavlja produkcijsko preverjeno stanje; razvoj poteka na `develop` ali feature vejah.
3. Primarno produkcijsko okolje je Hiper M; Vercel je namenjen samo preview/UX testiranju.
4. Arhitektura mora ostati vendor-neutral in ne sme biti odvisna od Vercel-specifičnih storitev.
5. Projekt mora omogočati tudi self-hosted izdajo z jasno ločeno konfiguracijo okolja.
6. Produkcijski backend uporablja Laravel 13 / PHP 8.4 in MariaDB 10.11; UI ostane ločen od poslovne logike.
7. Težki AI/OCR/background procesi ne smejo blokirati web requestov in morajo biti ločeni v job/integration sloj.
8. API ključi, gesla, certifikati in skrivnosti ne smejo biti zapisani v kodi ali GitHubu.
9. Produkcijski podatki se v razvoju ne uporabljajo brez zaščite in anonimizacije.
10. Računovodske knjižbe in kritične spremembe morajo imeti popolno revizijsko sled.
11. AI odločitve morajo biti razložljive, sledljive in pri kritičnih postopkih omogočati človeško potrditev.
12. Zaključenih knjižb se ne prepisuje neposredno; uporabljajo se korekcije oziroma storno postopki.
13. FURS, banke, AJPES in druge zunanje integracije se najprej preverjajo v testnem okolju.
14. Aplikacija mora biti responsive, večjezično pripravljena in dostopna na desktopu, tablici in telefonu.
15. Varnost, zakonodajna skladnost, pravilnost podatkov in možnost rollbacka imajo prednost pred hitrostjo razvoja.
