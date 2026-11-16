# FinAI NEXT-17B — pregled sintetičnih naročil iz spletnih trgovin

## Funkcionalnost

- Izključno lokalna/testna aplikacijska storitev **SyntheticCommerceReview**, brez javnega HTTP endpointa ali ponudniških poverilnic.
- **orders.read**: prikaz stranjenega, izključno sintetičnega pregleda naročil po podjetju. Paginacija z ID kazalcem, največ 50 zapisov na stran. Prikaz vsebuje samo ID testnega naročila, ponudnika, skladišče, skupni znesek v centih, število postavk in status; ne vsebuje celotnega JSON, plačilnih podatkov ali identitete kupca.
- **orders.write**: izrecno zabeleži testno odločitev `reviewed` ali `hold` o naročilu. Preverjanje podjetja, odločitve, statusa, fingerprinta in trenutnega dovoljenja je v eni transakciji.
- Ponovljena **enaka** odločitev vrne `replayed=true`, brez drugega audita. Nasprotna odločitev po zaključku je blokirana. Brez akumulacije podvojenih odločitev.
- Ponovna podpisana dostava prvotnega sintetičnega naročila vrne **dejanski** status `reviewed` oziroma `hold`, ne več vedno `review`.
- Revizijska sled za prvo odločitev je transakcijska. Neuspešno pisanje v audit vrne celotno stanje na prejšnjo različico.
- Odločitve so **izključno testne**; nič ne rezervira zalog, ne ustvarja računa, ne knjiži prihodkov in ne kliče API ponudnika.

## Kontrole

- Vsi dostopi so dvakrat omejeni: samo `APP_ENV=local/testing` in eksplicitno vključena testna zastavica; `CompanyWorkflowAccess` ponovno preveri status uporabnika, aktivno podjetje, aktivno članstvo in dovoljeno vlogo pri vsakem dejanju.
- Na vhodu so le zapisi obstoječe sintetične staging storitve. Celovitost vsake vrstice se preveri z že shranjenim SHA-256 fingerprintom, točnimi ključi normaliziranega dokumenta in stanjem `posting=false`.
- Nobenih pravih Shopify ali WooCommerce naročil ne sprejema in nobenih osebnih podatkov ne obdeluje.

## Ciljni QA

`Next14cSyntheticProviderOrdersTest` preverja Shopify in WooCommerce staging, stranjenje, nepooblaščeno podjetje, uporabnika samo za branje, dovoljene in prepovedane odločitve, ponovitve dogodkov, nespremenljiv audit, rollback in poškodovan fingerprint. Standardni Laravel Feature CI teče v izoliranem SQLite pomnilniku.

Pred resničnim delovanjem so nujni namenski FinAI Hiper M OS/cPanel račun, ločena baza, upravljanje pravih webhook poverilnic, dogovorjene računovodske/zaloga operacije, uporabniški QA in skladnost z RS/EU predpisi.

Laškoteka, STNG, cPanel/SSH/DNS in skupni sistemski račun `laskot48` niso bili in ne smejo biti spreminjani.
