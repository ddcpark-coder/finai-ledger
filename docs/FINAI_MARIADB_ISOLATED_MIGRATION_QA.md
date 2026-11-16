# FinAI NEXT-16 / migracije MariaDB 10.11 — izolirana revizija

## Razlog

Stara BACKEND-06 veja (#35) vsebuje uporabne popravke treh začetnih migracij, a temelji na zastareli veji in opisuje že opuščeno Vercel produkcijsko predpostavko. Samodejna združitev ni primerna.

## Preneseno na aktualni main

- Izrecno ime ciljne tabele `units_of_measure` pri povezavi v katalogu.
- Skrajšani imeni dveh indeksov v nabavnem modulu, združljivi z omejitvami MariaDB.
- Skrajšano ime indeksa projekta.
- `backend/.env.example` zdaj navaja aktualno domeno `e-integrator.si` namesto neobstoječe predpostavke `finai.si`; ne vsebuje pravih ključev ali podatkov.

## En izoliran preveritveni tok

`.github/workflows/finai-mariadb-migration-qa.yml` ustvari namensko začasno MariaDB 10.11 storitev z izključno sintetičnim CI uporabnikom, izvede vse trenutne FinAI migracije na **prazni** testni bazi, jih ponovi za idempotentnost ter preveri število migracij, ključne tabele in vklopljene tuje ključe. Test je ločen od Laravel Feature QA in ni produkcijska migracija.

**Ne uporabljati** `migrate:fresh`, splošnega `migrate --force` ali popravljanja že izvedenih začetnih migracij na Hiper M. Če bo nekoč obstoječa namenska FinAI baza že imela prejšnjo strukturo, jo je treba najprej prebrati in pripraviti izrecno korektivno migracijo ter obnovitveno točko.

## Nadaljnje meje

Uspešen CI dokazuje le kompatibilnost začetne sheme na disposable MariaDB, ne varnosti podatkov, pravilnosti knjiženja, pravic obstoječih baz ali izolacije OS/cPanel. Vsa strežniška pisanja ostajajo blokirana do samostojnega FinAI računa.

Zaščita Laškoteke in STNG ostaja absolutna; na `laskot48` ni dovoljenega FinAI pisanja. `app.e-integrator.si` ni usmerjen na Vercel.