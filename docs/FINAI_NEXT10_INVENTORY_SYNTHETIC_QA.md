# FinAI NEXT-10 — transakcijska skladiščna integracija in sintetični QA

Obstoječi razredi `ReserveSalesOrderInventory`, `IssueDeliveryNoteInventory` in `PostInventoryMovement` so utrjeni. Ni novega javnega API-ja in ni produkcijske migracije.

- Vse pisalne operacije zahtevajo aktivnega, preverjenega uporabnika z aktivnim članstvom in pravico `inventory.write`.
- Izdelek, skladišče, lokacija, naročilo, postavka in rezervacija morajo pripadati istemu podjetju; tuji ID-ji se zavrnejo.
- Rezervacija ne sme preseči razpoložljive zaloge ali količine naročila. Izdaja ne sme povzročiti negativne zaloge ali kršitve rezervacij.
- Delna poraba rezervacije ohranja status `active` in preostanek do naslednje dobavnice. Popolna izdaja označi rezervacijo `consumed`.
- Ista že izdana dobavnica se ne odšteje še enkrat. Premiki in revizijski zapisi so v isti DB transakciji.
- Ustrezni predznaki količin se preverjajo glede na vrsto premika.
- Vmesni test uporablja samo izmišljene izdelke in podjetja v SQLite `:memory:`. Spreminjanje realnih zalog in pravih podatkov je prepovedano.

Pred javno produkcijo ostajajo obvezni dodatni večuporabniški in konkurenčni testi na izolirani MariaDB, obnove, obračun nabavnih vrednosti, inventure, dobropisi, izdaje delnih dobavnic ter zakonodajni/računovodski QA. Laškoteka, STNG in skupni Hiper M ostanejo nedotaknjeni.
