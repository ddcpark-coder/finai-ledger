// Slovenian, synthetic-demo-aware onboarding guidance per FinAI module.
const guides={
 dashboard:["Kaj vidim na nadzorni plošči?","Pregled kartic ti pomaga poiskati naloge in pomembne podatke.","Izberi kartico, ki jo potrebuješ; razporeditev spremeni z Uredi pogled."],
 incoming_invoices:["Kako pregledam prejeti račun?","Preveri dobavitelja, številko, znesek in rok plačila.","Za vajo uporabi Nov demo račun, nato preglej predlog in izberi demo odobritev."],
 issued_invoices:["Kako pripravim izdani račun?","Najprej vnesi kupca, opis, znesek in rok plačila.","V demonstraciji lahko pripraviš osnutek, simuliraš izdajo in preveriš manjkajoče podatke za e-račun."],
 accounting:["Kaj pomeni knjiženje?","Knjiženje pravilno razporedi poslovne dogodke na konte.","Preglej konto, obdobje, zneske v breme in dobro; brez veljavnih kontrol ne potrjuj temeljnic."],
 banking:["Kako povežem plačilo z računom?","Bančno usklajevanje primerja nakazilo z odprto postavko.","Preveri sklic, smer in znesek; ujemanje potrdi samo, ko vsi podatki ustrezajo."],
 vat:["Kaj preverjam pri DDV?","DDV evidence prikazujejo obračunane in odbitne zneske.","Preglej izbrano obdobje in opozorila; demonstracija ne oddaja DDV obračunov."],
 edavki:["Kako poteka oddaja na FURS?","Dokument mora biti pravilno pripravljen, preverjen in odobren.","Za zdaj so na voljo le demonstracijski prikazi; pošiljanje na FURS ni aktivno."],
 partners:["Kje uredim kupce in dobavitelje?","Partner je podjetje ali oseba, s katero posluješ.","V pregledu poišči partnerja in preveri njegove podatke pred uporabo."],
 documents:["Kje pregledam dokumente?","Dokumenti povezujejo poslovne dogodke z dokazili.","Pri pomembnih listinah vedno preveri original, podjetje in pravice dostopa."],
 catalog:["Kako uporabim artikle in cenike?","Katalog združuje blago, storitve in cene.","Pred uporabo preveri enoto mere, ceno in ustrezno davčno obravnavo."],
 crm:["Kaj je CRM?","CRM pomaga spremljati stike s strankami in prodajne priložnosti.","Najprej preglej stranko, nato zabeleži naslednji korak."],
 quotes:["Kako sestavim ponudbo?","Ponudba opisuje blago ali storitev, ceno in pogoje.","Preveri postavke, rok veljavnosti in podatke kupca pred pošiljanjem."],
 orders:["Kako spremljam naročilo?","Naročilo povezuje sprejeto ponudbo, izvedbo in fakturiranje.","Spremljaj status in pomembne korake izvedbe; demonstracija še ne sproži računov."],
 procurement:["Kako poteka nabava?","Nabava zajema potrebe, ponudbe dobaviteljev in prevzeme.","Primerjaj ponudbe ter preveri naročeno in prejeto količino."],
 inventory:["Kako spremljam zalogo?","Zaloge prikazujejo količine po skladiščih in premikih.","Preveri lokacijo, razpoložljivo količino in morebitna opozorila."],
 projects:["Kako spremljam projekt?","Projekt združuje naloge, delovne ure in stroške.","Začni s pregledom odprtih nalog, nato preveri porabo časa in sredstev."],
 settings:["Kako prilagodim FinAI?","Nastavitve vplivajo na podjetje, videz in dostop.","Izberi podjetje in prilagodi razporeditev, zahtevnost ter velikost besedila."]
};
export function getModuleGuidance(moduleKey){
 const found=Object.hasOwn(guides,moduleKey)?guides[moduleKey]:null;
 if(!found)return {
  title:"Pomoč pri trenutnem pogledu",
  intro:"Izberi želeni podpogled in preveri, katere informacije prikazuje.",
  next:"Za lažje delo uporabi način Osnovno ali vprašaj računovodjo.",
  caution:"Prikazani podatki so sintetični. Ta izdaja ne izvaja resničnega knjiženja."
 };
 return {
   title:found[0],intro:found[1],next:found[2],
   caution:"FinAI je v razvojni demonstraciji s sintetičnimi podatki; funkcije so lahko prikazne in niso nadomestilo za strokovni pregled."
 };
}
