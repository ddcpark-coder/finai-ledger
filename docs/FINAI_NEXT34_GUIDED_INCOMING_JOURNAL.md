# FinAI NEXT34 – voden pregled sintetičnega prejetega računa in osnutka temeljnice

## Kaj lahko uporabnik zdaj preizkusi

V modulu Prejeti računi izberi trenutno podjetje, klikni **Nov demo račun** in vnesi samo povsem izmišljene podatke. Po **Odobri demo račun** se pod podrobnostmi odpre obrazec za ročno izbiro enega od dveh fiksnih sintetičnih stroškovnih kontov (4100 ali 4070). Po ločeni potrditvi pregleda gumb pripravi **uravnotežen, NEKNJIŽEN predogled**: strošek na breme, ilustrativni DDV na breme 2601 (če je >0) in bruto obveznost na dobro 2200.

Podprte so samo prikazne stopnje DDV 0 %, 9,5 % in 22 %, z determinističnim celoštevilčnim izračunom centov (zaokrožena neto osnova, ostanek kot prikazni DDV). Rezultat je označen kot **izključno ilustrativen**, ne kot pravilen slovenski DDV obračun ali zakonsko veljavna temeljnica.

## Varovalke

- Dovoljen je samo v trenutnem brskalniku ročno ustvarjen sintetični račun z `source=manual`, `demo=true`, statusom Odobreno, `approved=true`, nespremenjenim ID `PR-DEMO-<companyId>-NNNN` in izbranim podjetjem 1, 2 ali 3.
- Drugo podjetje, neodobren račun, nedovoljen konto, neveljaven znesek, nezakonit prikazni DDV ali manjkajoča uporabniška potrditev so zavrnjeni. Na spremembo podjetja, izbranega računa, konta ali potrditve se prejšnji predogled razveljavi.
- Izračun je povsem lokalen; nima HTTP POST, dostopa do realnega Laravela, originalnih dokumentov, trajnega shranjevanja, revizijskega zapisa, knjiženja, zalog ali FURS.
- Ta funkcija **ni** povezana s storitvijo NEXT29 `SyntheticApprovedInvoiceJournalWorkflow`. Ta ostaja strogo lokalna/testna aplikacijska storitev na izolirani SQLite bazi in ni javni računovodski endpoint.

## Minimalni QA

`node --test tests/demoIncoming.test.mjs tests/localFilePreview.test.mjs tests/demoAccountingRules.test.mjs tests/next34GuidedIncomingJournal.test.mjs`

Preizkusi vključujejo naravno uporabniško zaporedje, uravnotežen 22-odstotni primer, 9,5-/0-odstotni DDV, robne cente, vse tri podjetniške kontekste, prepoved nepravilne avtorizacije/stanj in regresijsko kontrolo UI. Že obstoječi workflow `incoming-demo.yml` zdaj sproži tudi NEXT34.

## Preverjena ločnica namestitve

Ciljni gostovalni račun FinAI je **izolirani `einteg86`**, ne stari skupni `laskot48`. Spletna aplikacija `app.e-integrator.si` in Laravel `api.e-integrator.si` morata ostati na namenskem gostovanju Hiper M; Vercel je dovoljen samo za zaščiten razvojni predogled s sintetičnimi podatki. Stare dokumente, ki opisujejo Vercel kot cilj aplikacijske domene ali `laskot48` kot lastnika, obravnavaj kot **zastarelo stanje** in NE kot navodilo za deploy.

Pred katerimkoli pisnim preklopom je obvezen svež read-only preflight dejanskega OS uporabnika, lastništva, realpath/symlink, dokumentnih korenov, DB uporabnika, naslovov domen, HTTPS, SHA256 nespremenljive izdaje, uspešnih ciljnih testov ter obnovitvene točke. Publikacija je dovoljena samo v dokazano izoliranem FinAI sistemu, z atomarnim povrnljivim preklopom. Nobena sprememba ni bila objavljena na Hiper M v tej fazi.

## Izrecna ločitev drugih projektov

Projekt Spoznaj Laško ima samostojen lastni CMS pilot (`ddcpark-coder/spoznaj-lasko`, veja `pilot/lastni-cms-20261123`), vendar ni predmet FinAI razvojnih pisalnih operacij. Za nadaljevanje CMS je potreben ločen projektni postopek. Laškoteka, STNG, skupni cPanel/SSH, `laskot48` in druge projekte FinAI nikoli ne spreminja.

## Naslednji korak

Na izoliranem FinAI stagingu povezati zaščiteni prijavljeni vmesnik z dejansko shemo sintetične knjižbe prek privzeto izklopljenega razvojnega API-ja, z jasnim revizijskim statusom in brez produkcijskega POST/knjiženja. Za realne podatke so prej obvezni šifriranje, avtorizacija, tenant izolacija, obnova in računovodsko-pravni QA.