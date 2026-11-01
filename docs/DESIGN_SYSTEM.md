# FinAI Ledger — Design System v1

## Namen
FinAI Ledger mora hkrati služiti dvema profiloma:
- podjetnik želi miren, pregleden in razumljiv pogled;
- računovodja želi gostoto podatkov, hitrost in nadzor.

Zato je osnovni UX princip: **progressive disclosure + configurable density**.

## Vizualna identiteta

### Dark — Financial Cockpit
- temno modra / skoraj črna podlaga;
- mint/teal kot primarni akcijski signal;
- modra za sistemske informacije;
- oranžna za opozorila;
- vijolična za AI in avtomatizacijo;
- subtilni gradienti samo za globino, nikoli za dekoracijo.

### Light — Editorial Finance
- nevtralna skoraj bela podlaga;
- modro-vijolični poudarki;
- manj senc, več tipografije in prostora;
- podatkovne tabele ostanejo kompaktne.

## Design tokens
- Radius: 10 / 14 / 18 px
- Spacing: 4 / 8 / 12 / 16 / 24 / 32
- Desktop sidebar: 248 px
- Context drawer: 360–420 px
- Max content width: fluid; brez umetnega omejevanja gostih tabel
- Typography: system sans; tabular numbers za finančne vrednosti
- Focus ring: 2 px kontrastni obroč
- Animacije: 120–220 ms; samo funkcionalne

## UX vzorci
1. **Progressive disclosure** — glavna tabela kaže ključne podatke; podrobnosti so v drawerju.
2. **Density switch** — Comfortable / Compact.
3. **Context drawer** — dokument, knjižbe, DDV, zgodovina in priloge brez menjave strani.
4. **Command palette** — hitri ukazi za power-userje.
5. **Status chips** — semantično konsistentni statusi.
6. **AI confidence** — številčna gotovost + razlaga + možnost zavrnitve.
7. **Sticky table header** — obvezno pri dolgih tabelah.
8. **Bulk actions** — več izborov brez izgube konteksta.
9. **Inline validation** — napake ob polju, ne samo globalni alert.
10. **Audit visibility** — pomembna dejanja vedno pokažejo kdo/kdaj/kaj.
11. **Mobile task mode** — kartice in zaporedni koraki namesto stisnjenih tabel.
12. **Keyboard first** — Tab, Enter, Esc, / za search in Cmd/Ctrl+K za ukaze.

## Glavni zasloni
- Nadzorna plošča
- Prejeti računi
- Izdani računi
- Knjiženje
- Banka
- DDV in poročila
- eDavki / FURS
- Partnerji
- Dokumenti
- Nastavitve

## Accessibility
- WCAG AA kontrast kot cilj
- vidni focus state
- ne zanašamo se samo na barvo
- najmanj 44 px touch target na mobilnem
- statusi imajo tekst in ikono

## Responsive
- >1280: poln sidebar + tabela + drawer
- 900–1279: sidebar zmanjšan; drawer overlay
- 600–899: mobilna navigacija + kartični seznam
- <600: task-first mobilni workflow

## Finančna tipografija
- zneski uporabljajo tabular numbers
- valuta je vizualno sekundarna
- negativne vrednosti niso samo rdeče, ampak imajo tudi znak
- decimalna vejica in slovenski format sta privzeta

## Pravilo oblikovanja
Vsaka nova komponenta mora odgovoriti na tri vprašanja:
1. Kaj je primarno dejanje?
2. Kaj mora uporabnik videti takoj?
3. Kaj lahko skrijemo v sekundarni nivo brez izgube nadzora?
