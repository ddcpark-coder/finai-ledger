# FINAI NEXT-06 — izolirana transakcijska glavna knjiga in zaloga (sintetični QA)

**Razvojni dokaz pravilnosti obdelave, ne produkcijsko knjiženje.** Uporablja samo fiksne sintetične podatke in namenski tabeli `synthetic_ledger_scenarios` ter `synthetic_ledger_events`. Ne spreminja tabel `journals`, `journal_entries`, `inventory_balances`, `inventory_movements`, dejanskih računov, davčnih evidenc ali podatkov drugih projektov.

## Tok in deterministične vrednosti

Fiksni primer na podjetje in prijavljenega uporabnika: 12 enot demo SKU, naročilo 3 enot, neto 100,00 EUR, demonstracijski DDV 22,00 EUR in bruto 122,00 EUR. Ta stopnja je **samo vrednost sintetičnega primera**, ne pravilo za davčno odločanje.

1. `reserve` — rezervira tri enote, fizična količina ostane 12.
2. `deliver` — rezervacija se porabi, zaloga je 9, izdano 3.
3. `invoice` — preveri dvostavno demo knjižbo: debet 1200 / 122,00; kredit 7600 / 100,00; kredit 2600 / 22,00.
4. `reverse_invoice` — ustvari nasprotne **sintetične** knjižbe; ne vrne blaga v zalogo, ker stornacija računa sama po sebi ni vračilo izdelka.

Vse količine so cela števila; denar je v centih. `BalanceCalculator::assertBalanced` preprečuje neuravnotežene knjižbe. Stanje ni možno preskočiti ali dvakrat izvršiti.

## Kontrole

- Prijava in potrjen e-naslov, veljavno članstvo v podjetju; pisalni test zahteva `ledger.post`.
- Sintetični API obstaja samo v `APP_ENV=testing/local` **in** ob eksplicitno vklopljeni zastavici `FINAI_SYNTHETIC_LEDGER_SCENARIO_ENABLED` (privzeto izključena).
- `event_id` in `expected_version` z zaklenjeno transakcijo omogočata idempotenten replay ter preprečujeta preskoke verzije.
- Stanje, dogodek in revizijska sled se zapišejo znotraj *ene* DB transakcije. Testni failpoint sproži izjemo po vnosu dogodka in preveri, da je celoten zapis razveljavljen.
- Testi vključujejo preizkuse dveh podjetij, dveh uporabnikov, manjkajočih pravic, neveljavnega zaporedja, napačnega zneska/zaokroževanja v domeni, uravnoteženja, izdaj in stornacij.
- API ne daje pravih podpisov, knjižb, FURS, bančnih, prodajnih ali skladiščnih nalog. Vsa kontrola je na izmišljeni shemi.

## Izvedba QA

V varnem GitHub Actions okolju z `DB_CONNECTION=sqlite` in `DB_DATABASE=:memory:` izvedi:

```sh
cd backend
php artisan test --filter=SyntheticTransactionalScenarioTest
```

Nato povezana Feature CI preverjanja. Migracija se v testu uporablja samo lokalno; **ni dovoljenja** za migracije na skupnem Hiper M.

## Pred javno uporabo

Potrebni so produkcijski računovodski in skladiščni integracijski testi z lastnimi izoliranimi podatkovnimi bazami, zahtevne tolerance/zaokroževanje, več računovodskih obdobij, realna pooblastila, revizija, podpisana izdaja in obnovitev. FinAI mora imeti ločen preverjeno izoliran OS/cPanel račun; Laškoteka in STNG ostajata nedotaknjeni.
