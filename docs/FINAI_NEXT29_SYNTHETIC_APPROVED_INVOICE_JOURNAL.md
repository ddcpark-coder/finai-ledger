# FinAI NEXT29 — človeško potrjen sintetični prejeti račun in predpregled temeljnice

NEXT29 uporablja obstoječo dejansko računovodsko shemo, vendar **izključno** na sintetičnih podatkih in v izolirani lokalni/testni podatkovni bazi SQLite. Zahteva oba izrecna izklopljena privzeta zastavica: FINAI_SYNTHETIC_APPROVED_INVOICE_WORKFLOW_ENABLED in FINAI_SYNTHETIC_JOURNAL_PREVIEW_ENABLED. Poleg tega je dostop v sami aplikacijski storitvi zavrnjen v vseh drugih okoljih, vključno s production.

Postopek: izmišljen prejeti račun SYN-INV-... z veljavnim dokumentom/partnerjem in kontroliranimi zneski najprej potrdi obstoječa storitev ApproveIncomingInvoice. Nato človek z aktivenim članstvom, pravico invoices.approve in ledger.post prek ločene metode acceptProposal potrdi izrecno sintetični predlog kontiranja, ki se mora natančno ujemati z neknjiženo temeljnico iz obstoječe storitve PreviewSyntheticDraftJournal. Potrditev predloga se atomarno zapiše v accounting_proposals in revizijsko sled; ob neuspešni reviziji se razveljavi. Metoda preview nato samo bere odobren račun, potrjen predlog in povezano osnutno temeljnico, ponovno preveri konte, obdobje, davčne povezave, ravnotežje in bruto vrednost, ter vrne omejen, sintetični odgovor brez PII in z postingAllowed=false.

Nobena metoda ne ustvari nove temeljnice, ne kliče PostJournal in ne knjiži v glavno knjigo. Ni javne HTTP poti, avtomatizacije ali samodejne odobritve. Obstoječa prava knjižilna storitev ni vključena v ta tok in ostaja izven produkcijskega dovoljenja.

Ciljni QA: php artisan test --filter=SyntheticApprovedInvoiceWorkflowTest; migracije in testi delujejo samo na SQLite :memory:. Preverjajo vrstni red človeške odobritve, izolacijo podjetij, prepoved nepravilnega predloga, zaklenjenega obdobja, knjižene temeljnice, produkcijskega okolja in napake pri zapisovanju revizije. Niso potrdilo za zakonito knjiženje, DDV, FURS ali produkcijske resnične podatke.

FinAI-only repozitorij. Laškoteka, STNG, gostovanje, skupni cPanel/SSH, laskot48 in podatkovne baze drugih projektov ostanejo nedotaknjeni.
