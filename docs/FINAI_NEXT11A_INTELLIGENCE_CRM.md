# FinAI NEXT11A — interaktivna poslovna analitika in CRM (samo sintetično)

- Dodana sta prilagodljiva FinAI Intelligence in CRM 360 modula ob obstoječem delovnem prostoru.
- FinAI Intelligence računa prihodke, stroške, rezultat in maržo v celoštevilskih centih. Omogoča filtriranje po poslovni enoti, preklop vrste grafikona in tabelaričen pregled šestih mesecev. Vsaka vrstica, agregat in znesek nastaneta iz enega determinističnega sintetičnega modela.
- CRM 360 prikazuje priložnosti po fazah, uteženo napoved in demo opomnike. Uporabnik lahko postopoma premika priložnosti v naslednjo dovoljeno fazo. Verzioniranje preprečuje zastarele ukaze, druge poslovne enote in podjetja se ne mešajo.
- Uporabniška dejanja ne ustvarjajo realnih CRM zapisov, ne izvajajo knjiženja in ničesar ne pošiljajo na strežnik. CRM stanje se ponastavi ob ponovnem odprtju komponente; ostane izključno v RAM brskalnika.
- Vsa imena, KPI in organizacijske enote so sintetični. Pogled ostaja prilagodljiv za Windows in mobilno širino.
- Ohranjen je obstoječi demo CRM; novi panel ga ne nadomesti pred povezavo na izolirano, testirano poslovno bazo.
- Kontrole: node --test tests/next11BusinessModel.test.mjs, obstoječa GitHub Actions gradnja Next.js in desktop/mobile QA.

Šele po potrjeni izolaciji FinAI računov, strežnika in podatkov se lahko načrtuje uvajanje resničnih podatkov. Ni posegov v Laškoteko, STNG ali skupni Hiper M.
