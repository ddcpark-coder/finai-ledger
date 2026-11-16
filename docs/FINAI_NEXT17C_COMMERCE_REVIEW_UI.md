# FinAI NEXT-17C — pregled trgovinskih naročil v modulu Integracije

## Obseg

V obstoječem modulu **Integracije** je sedaj samostojen demonstracijski pregled. Vključuje lokalni vzorčni Shopify/WooCommerce vrstni red naročil in začasni izbiri **Pregledano** / **Zadrži**. Te spremembe so samo v pomnilniku brskalnika, niso pravne potrditve in ne ustvarijo nobenega strežniškega zapisa, računa ali premika zalog.

Pod njim je ločen **lokalni testni Laravel pregled**, ki se aktivira šele po izrecnem pritisku gumba. Browser dovoljuje izključno **isti localhost origin** in konfiguracijo API-ja z natančno potjo `/api`; brez javnega oziroma oddaljenega strežnika. Za ta način mora lokalni reverse proxy usmerjati `/api` in `/sanctum/csrf-cookie` na Laravel, uporabnik pa mora biti prijavljen. Če to ni vzpostavljeno, UI ostane na varnem lokalnem predogledu.

## Zaledje

GET `/api/companies/{companyId}/demo/commerce-review` vrne samo omejen seznam sintetičnih naročil, ob pravici `orders.read`. POST `.../{orderId}/decision` sprejme le `reviewed` oziroma `hold` z dovoljenjem `orders.write`. Vsi zahtevki podedujejo obstoječe `auth:web`, preverjanje e-pošte, 2FA guard in throttling. Servis in controller se dodatno samostojno omejita na `APP_ENV=local/testing` in omogočeno testno zastavico. Na produkciji API vrača 404.

Pregled in spremembe so izolirani po podjetjih, normalizirani podatki ne vsebujejo PII, odgovor ne vrača celotnega JSON-ja, stanj ali pobotov ni mogoče prisiliti. Prva odločitev je transakcijsko revidirana, dvojna enaka odločitev ne ustvari drugega audita.

## Ciljni QA

- `tests/next11Operations.test.mjs`: odločitev v brskalniškem predogledu ne spreminja zaloge in ne dovoljuje sprememb po zaključku.
- `tests/syntheticCommerceReviewClient.test.mjs`: lokalni origin, CSRF cookie, zavrnitev tujega strežnika, 401/403/404/409 ter stroga PII-free shema.
- `Next14cSyntheticProviderOrdersTest`: HTTP 401 za neprijavljene, 403 za tuja podjetja / uporabnike brez dovoljenj, 422 za neveljavne odločitve, 409 za že zaključeno, 404 v produkciji; odgovori ohranijo `posting=false`.
- Workflow `finai-next11-operations-qa.yml` gradi statični Next.js demo in izvaja ciljne Node teste; obstoječi Laravel Feature CI preverja zaledni test.

## Omejitve

Vmesnik še ni produkcijski nadzorni center ali povezava do resničnih spletnih trgovin. Za dejanske mobilne seje in internetni Laravel proxy je nujen nadaljnji QA prijave, 2FA, CSRF in revokacije ter namenska izolirana infrastruktura FinAI. Uporabljajo se samo sintetični podatki.

Nobeno pisanje na Hiper M, STNG, Laškoteko ali skupne cPanel/SSH storitve ni dovoljeno.
