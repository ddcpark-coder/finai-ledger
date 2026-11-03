"use client";
import {useEffect,useMemo,useState} from "react";
import dynamic from "next/dynamic";
import {defaultNavigation as nav,modules} from "./modules/moduleRegistry";
import ContextNavigation from "./components/ContextNavigation";
import useContextNavigation from "./hooks/useContextNavigation";
import useWorkspacePreferenceSync,{useLocalWorkspaceAppearance} from "./hooks/useWorkspacePreferenceSync";

const loading=()=> <div style={{padding:16,border:"1px solid var(--line)",borderRadius:14,background:"var(--panel)",color:"var(--muted)",fontSize:11}}>Nalaganje modula …</div>;
const PartnerWorkspace=dynamic(()=>import("./partners/PartnerWorkspace"),{loading});
const IncomingInvoicesWorkspace=dynamic(()=>import("./incoming/IncomingInvoicesWorkspace"),{loading});
const IssuedInvoicesWorkspace=dynamic(()=>import("./issued/IssuedInvoicesWorkspace"),{loading});
const BankingWorkspace=dynamic(()=>import("./banking/BankingWorkspace"),{loading});
const VatWorkspace=dynamic(()=>import("./vat/VatWorkspace"),{loading});
const EdavkiWorkspace=dynamic(()=>import("./edavki/EdavkiWorkspace"),{loading});
const DocumentsWorkspace=dynamic(()=>import("./documents/DocumentsWorkspace"),{loading});
const CatalogWorkspace=dynamic(()=>import("./catalog/CatalogWorkspace"),{loading});
const CrmWorkspace=dynamic(()=>import("./crm/CrmWorkspace"),{loading});
const QuotesWorkspace=dynamic(()=>import("./quotes/QuotesWorkspace"),{loading});
const SalesOrdersWorkspace=dynamic(()=>import("./orders/SalesOrdersWorkspace"),{loading});
const ProcurementWorkspace=dynamic(()=>import("./procurement/ProcurementWorkspace"),{loading});
const InventoryWorkspace=dynamic(()=>import("./inventory/InventoryWorkspace"),{loading});
const ProjectsWorkspace=dynamic(()=>import("./projects/ProjectsWorkspace"),{loading});

const moduleData={
"Nadzorna plošča":{
subtitle:"Pregled poslovanja, avtomatizacije in davčnih obveznosti.",
stats:[["AI predlogi","24","+18 danes","ai"],["Računi za pregled","7","12.450,80 €","info"],["Bančne neusklajenosti","3","1.240,00 €","warn"],["Roki za oddajo","2","1 kritičen","danger"]],
rows:[
["DDV-O 10/2026","eDavki","Pripravljeno","20. 11. 2026","Visoka"],
["Prejeti računi","7 dokumentov","Za pregled","Danes","Visoka"],
["Banka","3 postavke","Neusklajeno","Danes","Srednja"],
["AI knjiženje","18 predlogov","Čaka odobritev","Danes","Srednja"]
]},
"Prejeti računi":{
subtitle:"OCR, AI razpoznavanje in predlogi knjiženja.",
stats:[["Za pregled","7","12.450,80 €","warn"],["AI predlogi","24","18 visoka gotovost","ai"],["Samodejno potrjeno","16","ta mesec","ok"],["Povprečen čas","42 s","-18 %","info"]],
rows:[
["MER-2026-04562","Merkur d.o.o.","1.240,00 €","92 %","Novo"],
["P-2026-88021","Petrol d.d.","320,00 €","96 %","Odobreno"],
["TS-2026-33421","Telekom Slovenije","185,00 €","90 %","V pregledu"],
["LIDL-2026-7788","Lidl Slovenija","214,50 €","88 %","Novo"],
["AMZS-2026-112","AMZS d.d.","79,90 €","97 %","Odobreno"]
]},
"Izdani računi":{
subtitle:"Izdaja računov, terjatve, e-računi in spremljanje plačil.",
stats:[["Terjatve","24.560,00 €","+8,2 %","info"],["Zapadlo","3.240,00 €","4 računi","danger"],["Plačano","18.320,00 €","ta mesec","ok"],["Promet","22.480,00 €","+12,4 %","ai"]],
rows:[
["2026-0054","ABC d.o.o.","1.220,00 €","29. 11. 2026","Plačano"],
["2026-0053","Gamma d.o.o.","2.440,00 €","28. 11. 2026","Poslano"],
["2026-0052","Studio Kreativ s.p.","915,00 €","27. 11. 2026","Osnutek"],
["2026-0051","Delta d.o.o.","1.830,00 €","26. 11. 2026","Zapadlo"]
]},
"Knjiženje":{
subtitle:"Glavna knjiga, kontni načrt in nadzor AI predlogov.",
stats:[["Predlogi knjižb","18","čaka pregled","ai"],["Samodejna pravila","12","aktivna","ok"],["Revizijski zapisi","1.256","ta mesec","info"],["Obdobje","11/2026","odprto","warn"]],
rows:[
["1600","Material","550,00 €","—","V ravnotežju"],
["2600","Obveznosti do dobaviteljev","—","671,00 €","OK"],
["2601","Vstopni DDV","121,00 €","—","OK"],
["4100","Storitve","980,00 €","—","Pregled"]
]},
"Banka":{
subtitle:"Uvoz izpiskov in inteligentno usklajevanje odprtih postavk.",
stats:[["Stanje","12.450,80 €","NLB","info"],["Predlagane povezave","8","AI","ai"],["Neusklajene","4","1.240,00 €","warn"],["SEPA čaka","3","2.980,00 €","ok"]],
rows:[
["STRANKA d.o.o.","Plačilo 2026-034","+1.240,00 €","100 %","Predlagano"],
["AMZS d.d.","Povračilo","+560,00 €","100 %","Usklajeno"],
["PETROL d.d.","Plačilo računa","-220,45 €","94 %","Predlagano"],
["Neznan priliv","Brez sklica","+480,00 €","42 %","Pregled"]
]},
"DDV in poročila":{
subtitle:"DDV evidence, kontrolna pravila in priprava poročil.",
stats:[["DDV obveznost","2.450,00 €","11/2026","danger"],["Vstopni DDV","12.450,00 €","preverjeno","ok"],["Izstopni DDV","14.900,00 €","preverjeno","info"],["Rok","20. 12. 2026","19 dni","warn"]],
rows:[
["DDV-O","11/2026","67 %","Validacija","V pripravi"],
["VIES","11/2026","7 transakcij","Preverjeno","V redu"],
["Rekapitulacija","11/2026","4 poročila","Pripravljeno","V redu"],
["Kontrola evidenc","11/2026","1 opozorilo","Preglej","Opozorilo"]
]},
"eDavki / FURS":{
subtitle:"Testni tok oddaje, validacije, podpisovanja in statusov.",
stats:[["Pripravljeno","4","čaka podpis","info"],["V validaciji","1","testni način","warn"],["Oddano","12","uspešno","ok"],["Napake","0","zadnjih 30 dni","ai"]],
rows:[
["DDV-O 11/2026","Pripravljeno","XML schema OK","Ni podpisano","Test"],
["REK-O 11/2026","Validacija","Poslovna pravila","Čaka","Test"],
["DDV-O 10/2026","Oddano","Sprejeto","Podpisano","Test"],
["DPS 11/2026","Pripravljeno","XML schema OK","Ni podpisano","Test"]
]},
"Partnerji":{
subtitle:"Centralni register partnerjev in odprtih postavk.",
stats:[["Aktivni","128","+6 letos","info"],["Odprti saldo","18.320,00 €","terjatve","warn"],["EU partnerji","24","VIES preverjeno","ok"],["Tvegani","3","ročni pregled","danger"]],
rows:[
["ACME d.o.o.","SI12345678","Slovenija","1.240,00 €","Aktiven"],
["Beta trgovina d.o.o.","SI98765432","Slovenija","0,00 €","Aktiven"],
["Gamma GmbH","DE123456789","Nemčija","2.480,00 €","Aktiven"],
["Delta SRL","IT12345678901","Italija","730,00 €","Aktiven"]
]},
"Dokumenti":{
subtitle:"Varna hramba, povezovanje dokumentov in revizijska sled.",
stats:[["Dokumenti","1.842","+84 ta mesec","info"],["Za pregled","7","čaka uporabnika","warn"],["Povezani","98,4 %","z evidencami","ok"],["Hramba","EU","politika aktivna","ai"]],
rows:[
["Račun R-2026-1245.pdf","Računi","31. 10. 2026","2036","Varno"],
["Pogodba ACME.pdf","Pogodbe","22. 10. 2026","2036","Varno"],
["Cenik 2026.xlsx","Priloge","5. 10. 2026","2034","Varno"],
["DDV-potrdilo.pdf","Dokazila","2. 10. 2026","2036","Varno"]
]},
"Nastavitve":{
subtitle:"Podjetje, uporabniki, vloge, integracije in varnost.",
stats:[["Uporabniki","4","3 aktivni","info"],["Vloge","4","RBAC","ai"],["Integracije","5","2 testni","warn"],["2FA","Vključena","vsi admini","ok"]],
rows:[
["Jeziki","SL · EN · DE · IT","Pripravljeno","","Aktivno"],
["eDavki / FURS","Testni vmesnik","Digitalno potrdilo","","Pripravljeno"],
["GDPR","Politike in pravice","Revizijska sled","","Skladno"],
["Tema","Dark / Light","Uporabniška izbira","","Aktivno"]
]}
};

const css=`
.contextQuickAccess{display:flex;gap:7px;align-items:center;min-width:0;flex-wrap:wrap;margin:-3px 0 12px}
.contextQuickAction,.contextFavorite{flex:0 0 auto;border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:9px;min-height:32px;padding:6px 10px;font-size:9px;font-weight:700}
.contextQuickAction:hover,.contextFavorite:hover{color:var(--text);border-color:var(--accent)}
.contextQuickAction.saved{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,var(--panel))}
.contextFavoriteList{display:flex;align-items:center;gap:6px;overflow-x:auto;max-width:100%;min-width:0;scrollbar-width:none}
.contextFavoriteList::-webkit-scrollbar{display:none}
.contextFavorite{white-space:nowrap;font-size:9px;max-width:235px;overflow:hidden;text-overflow:ellipsis}
.contextFavorite span{color:var(--accent)}
.contextFavorite[aria-current="page"]{border-color:var(--accent);color:var(--text)}
.contextQuickNotice{font-size:9px;color:var(--accent);min-width:0}
.contextSyncState{margin-left:auto;font-size:9px;white-space:nowrap;color:var(--muted)}
.contextSyncState.synced{color:var(--ok)}.contextSyncState.offline,.contextSyncState.conflict,.contextSyncState.blocked{color:var(--warn)}
@media(max-width:760px){.contextQuickAccess{flex-wrap:wrap;margin-bottom:10px}.contextFavoriteList{flex-basis:100%;order:2}.contextQuickAction{min-height:36px}}
*{box-sizing:border-box}button,input{font:inherit}body{margin:0}.app{
--bg:#07111d;--bg2:#0a1624;--panel:#0d1b2b;--panel2:#0a1724;--text:#f4f8ff;--muted:#8fa2b8;--line:#1c3147;
--accent:#17dfbe;--accent2:#2f7cff;--violet:#9a6cff;--warn:#ffae57;--danger:#ff657a;--ok:#4fd18b;
min-height:100vh;background:
radial-gradient(circle at 76% -10%,#123a5f 0,transparent 34%),
radial-gradient(circle at 15% 80%,#10253d 0,transparent 30%),var(--bg);
color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
display:grid;grid-template-columns:248px minmax(0,1fr);letter-spacing:-.01em}
.app.light{--bg:#f4f7fb;--bg2:#eef2f8;--panel:#ffffff;--panel2:#f9fbff;--text:#0c1730;--muted:#687891;--line:#dce4ef;
--accent:#6558ff;--accent2:#2775ff;--violet:#8157ff;--warn:#bb6d00;--danger:#d83a56;--ok:#147a51;
background:radial-gradient(circle at 18% 0,#dbe8ff,transparent 32%),radial-gradient(circle at 90% 12%,#ece3ff,transparent 27%),var(--bg)}
button{cursor:pointer}.sidebar{height:100vh;position:sticky;top:0;padding:18px 14px;border-right:1px solid var(--line);background:color-mix(in srgb,var(--panel) 94%,transparent);backdrop-filter:blur(18px);display:flex;flex-direction:column;z-index:20}
.brand{display:flex;align-items:center;gap:11px;padding:4px 5px 16px}.logo{width:40px;height:40px;border:1px solid color-mix(in srgb,var(--accent) 70%,var(--line));border-radius:13px;display:grid;place-items:center;font-weight:900;color:var(--accent);box-shadow:0 0 28px color-mix(in srgb,var(--accent) 18%,transparent)}
.brand b,.brand small{display:block}.brand small{font-size:10px;color:var(--muted);margin-top:3px}.nav{display:grid;gap:3px}.nav button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:var(--muted);padding:10px 11px;border-radius:11px;text-align:left;font-size:13px}
.nav button i{width:21px;text-align:center;font-style:normal;font-size:15px}.nav button:hover{background:color-mix(in srgb,var(--panel) 72%,var(--accent) 8%);color:var(--text)}
.nav button.active{color:var(--text);background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 15%,var(--panel)),color-mix(in srgb,var(--accent2) 8%,var(--panel)));box-shadow:inset 3px 0 var(--accent)}
.sideMeta{margin-top:auto;border:1px solid var(--line);background:linear-gradient(145deg,color-mix(in srgb,var(--panel) 96%,var(--accent) 4%),var(--panel2));border-radius:14px;padding:12px}.sideMeta span,.sideMeta b,.sideMeta small{display:block}.sideMeta span{color:var(--accent);font-size:9px;font-weight:800;letter-spacing:.12em}.sideMeta b{font-size:12px;margin-top:5px}.sideMeta small{color:var(--muted);font-size:10px;margin-top:3px}
.shell{min-width:0}.topbar{border-bottom:1px solid var(--line);position:sticky;top:0;z-index:15;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(18px)}
.topbarMain{min-height:92px;display:flex;align-items:center;gap:14px;padding:17px 24px 13px}.headCopy{min-width:0}.headCopy h1{margin:0;font-size:24px;letter-spacing:-.035em}.headCopy p{margin:5px 0 0;color:var(--muted);font-size:11px}.topActions{margin-left:auto;display:flex;align-items:center;gap:8px}
.contextNav{padding:0 24px 11px;display:grid;gap:7px}.contextRow{display:flex;align-items:center;gap:6px;overflow-x:auto;scrollbar-width:none;overscroll-behavior-x:contain}.contextRow::-webkit-scrollbar{display:none}.contextRow button{flex:0 0 auto;border:1px solid transparent;background:transparent;color:var(--muted);border-radius:9px;white-space:nowrap;transition:.14s ease}.contextRow.level2 button{padding:7px 10px;font-size:10px;font-weight:700}.contextRow.level2 button:hover{color:var(--text);background:color-mix(in srgb,var(--panel) 72%,var(--accent) 6%)}.contextRow.level2 button.active{color:var(--text);border-color:color-mix(in srgb,var(--accent) 46%,var(--line));background:linear-gradient(120deg,color-mix(in srgb,var(--accent) 12%,var(--panel)),color-mix(in srgb,var(--accent2) 6%,var(--panel)))}.contextRow.level3{padding-left:2px}.contextRow.level3:before{content:"↳";color:var(--muted);font-size:10px;margin-right:1px}.contextRow.level3 button{padding:5px 9px;font-size:9px}.contextRow.level3 button:hover{color:var(--text);background:var(--panel)}.contextRow.level3 button.active{color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--panel));border-color:color-mix(in srgb,var(--accent) 30%,var(--line))}.seg{display:flex;border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:3px}.seg button{border:0;background:transparent;color:var(--muted);font-size:10px;padding:6px 8px;border-radius:7px}.seg button.on{background:color-mix(in srgb,var(--accent) 12%,var(--panel));color:var(--text)}
.iconBtn,.themeBtn,.commandBtn{border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:10px;min-height:36px;padding:0 10px}.commandBtn{color:var(--muted);font-size:11px;min-width:140px;text-align:left}.commandBtn kbd{float:right;color:var(--muted);font-size:9px}.avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#1d3550,#101e31);border:1px solid var(--line);font-size:10px;font-weight:800}
.content{padding:18px 24px 34px}.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}.hero small{color:var(--accent);font-size:9px;font-weight:900;letter-spacing:.13em}.hero h2{margin:5px 0 3px;font-size:21px}.hero p{margin:0;color:var(--muted);font-size:11px}.heroActions{display:flex;gap:8px}
.primary,.secondary{border-radius:10px;padding:9px 12px;font-size:11px;font-weight:700}.primary{border:1px solid color-mix(in srgb,var(--accent) 80%,white 10%);background:linear-gradient(120deg,color-mix(in srgb,var(--accent) 78%,#04735f),color-mix(in srgb,var(--accent2) 82%,#1649a0));color:white;box-shadow:0 8px 28px color-mix(in srgb,var(--accent) 14%,transparent)}
.secondary{border:1px solid var(--line);background:var(--panel);color:var(--text)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.kpi{border:1px solid var(--line);background:linear-gradient(150deg,var(--panel),var(--panel2));border-radius:15px;padding:13px;min-height:105px;position:relative;overflow:hidden}.kpi:after{content:"";position:absolute;width:80px;height:80px;border-radius:50%;right:-24px;top:-28px;background:color-mix(in srgb,var(--tone,var(--accent)) 10%,transparent);filter:blur(4px)}
.kpiTop{display:flex;justify-content:space-between;align-items:center;gap:8px}.kpiTop small{color:var(--muted);font-size:10px}.dot{width:8px;height:8px;border-radius:50%;background:var(--tone,var(--accent));box-shadow:0 0 16px var(--tone,var(--accent))}.kpi strong{display:block;font-size:24px;margin-top:7px;font-variant-numeric:tabular-nums}.kpi em{display:block;font-style:normal;color:var(--muted);font-size:9px;margin-top:4px}.kpi.ai{--tone:var(--violet)}.kpi.info{--tone:var(--accent2)}.kpi.warn{--tone:var(--warn)}.kpi.danger{--tone:var(--danger)}.kpi.ok{--tone:var(--ok)}.compact .kpi{min-height:84px;padding:10px}.compact .kpi strong{font-size:21px}.compact .tr{min-height:38px}.compact .toolbar{padding:7px 10px}
.workspace{display:grid;grid-template-columns:minmax(0,1fr) 326px;gap:10px;margin-top:10px}.panel{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.panelHead{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid var(--line)}.panelHead h3{margin:0;font-size:12px}.panelHead span{font-size:9px;color:var(--muted)}
.toolbar{display:flex;gap:7px;padding:10px 12px;border-bottom:1px solid var(--line)}.search{flex:1;min-width:0;background:var(--bg2);border:1px solid var(--line);border-radius:9px;padding:8px 10px;color:var(--text);font-size:11px;outline:none}.search:focus{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 16%,transparent)}
.tableWrap{overflow:auto}.table{min-width:720px}.tr{display:grid;grid-template-columns:1.25fr 1.45fr 1fr .9fr .85fr;align-items:center;border-bottom:1px solid var(--line);padding:0 12px;min-height:46px}.tr.head{position:sticky;top:0;background:var(--panel);z-index:2;min-height:37px;color:var(--muted);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.tr.row{width:100%;border-left:0;border-right:0;border-top:0;background:transparent;color:var(--text);text-align:left}.tr.row:hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}.tr span{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tr .num{font-variant-numeric:tabular-nums;font-weight:700}.chip{display:inline-flex!important;width:max-content;align-items:center;gap:5px;padding:4px 7px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);font-size:9px!important}
.aiPanel{padding:14px}.aiHead{display:flex;align-items:center;gap:10px}.orb{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--violet) 70%,var(--line));background:linear-gradient(145deg,color-mix(in srgb,var(--violet) 14%,var(--panel)),var(--panel));color:#c5adff;font-weight:900;box-shadow:0 0 24px color-mix(in srgb,var(--violet) 14%,transparent)}.aiHead small{color:#b39cff;font-size:9px;font-weight:900;letter-spacing:.1em}.aiHead h3{margin:3px 0 0;font-size:14px}.aiPanel p{color:var(--muted);font-size:10px;line-height:1.55}.confidence{margin:12px 0;padding:10px;border:1px solid var(--line);border-radius:11px;background:var(--bg2)}.confidenceTop{display:flex;justify-content:space-between;font-size:10px}.bar{height:5px;background:var(--line);border-radius:99px;margin-top:8px;overflow:hidden}.bar i{display:block;height:100%;width:92%;background:linear-gradient(90deg,var(--violet),var(--accent));border-radius:inherit}.audit{display:grid;gap:7px;margin-top:12px}.audit div{display:grid;grid-template-columns:24px 1fr;gap:7px;align-items:start}.audit i{width:24px;height:24px;border:1px solid var(--line);border-radius:8px;display:grid;place-items:center;font-style:normal;font-size:9px;color:var(--accent)}.audit b,.audit small{display:block}.audit b{font-size:9px}.audit small{font-size:8px;color:var(--muted);margin-top:2px}
.drawer{position:fixed;right:0;top:0;height:100vh;width:min(420px,94vw);background:color-mix(in srgb,var(--panel) 98%,transparent);border-left:1px solid var(--line);z-index:50;box-shadow:-30px 0 90px #0006;padding:18px;transform:translateX(100%);transition:.18s ease}.drawer.open{transform:none}.drawerHead{display:flex;justify-content:space-between;align-items:center}.drawerHead h3{margin:0;font-size:17px}.drawerClose{border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;width:34px;height:34px}.drawerMeta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.drawerMeta div{border:1px solid var(--line);border-radius:11px;padding:10px;background:var(--bg2)}.drawerMeta small,.drawerMeta b{display:block}.drawerMeta small{color:var(--muted);font-size:8px}.drawerMeta b{font-size:11px;margin-top:4px}.drawerSection{border-top:1px solid var(--line);margin-top:16px;padding-top:14px}.drawerSection h4{font-size:10px;margin:0 0 9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.command{position:fixed;inset:0;background:#0008;z-index:80;display:grid;place-items:start center;padding-top:12vh}.commandBox{width:min(620px,92vw);background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:0 30px 100px #000a;overflow:hidden}.commandBox input{width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);padding:15px;outline:none}.commandList{padding:8px;display:grid;gap:4px}.commandList button{border:0;background:transparent;color:var(--text);padding:10px;border-radius:9px;text-align:left}.commandList button:hover{background:color-mix(in srgb,var(--accent) 8%,var(--panel))}
.customGrid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;margin-top:10px}.widget{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden;min-height:150px;grid-column:span 4}.widget.s{grid-column:span 3}.widget.m{grid-column:span 4}.widget.l{grid-column:span 6}.widget.xl{grid-column:span 12}.widget.dragging{opacity:.45}.widgetHead{display:flex;align-items:center;gap:8px;padding:11px 12px;border-bottom:1px solid var(--line)}.dragHandle{border:0;background:transparent;color:var(--muted);font-size:14px;padding:2px 4px;cursor:grab}.widgetHead strong{font-size:11px}.widgetHead small{margin-left:auto;color:var(--muted);font-size:8px}.widgetBody{padding:12px}.widgetMetric{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums}.widgetSub{font-size:9px;color:var(--muted);margin-top:4px}.miniBars{height:92px;display:flex;align-items:end;gap:7px;padding-top:10px}.miniBars i{flex:1;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,var(--accent),color-mix(in srgb,var(--accent2) 72%,var(--accent)));min-height:8px;opacity:.86}.miniList{display:grid;gap:7px}.miniList div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding:7px 0;font-size:10px}.miniList span{color:var(--muted)}.customizer{position:fixed;inset:0;background:#0008;z-index:90;display:grid;place-items:center;padding:18px}.customBox{width:min(760px,96vw);max-height:88vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:18px;box-shadow:0 30px 100px #000a}.customHead{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;border-bottom:1px solid var(--line)}.customHead h3{margin:0;font-size:15px}.customBody{padding:14px}.presetRow{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}.widgetCatalog{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.widgetOption{border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--bg2);display:grid;grid-template-columns:1fr auto;gap:7px}.widgetOption b{font-size:11px}.widgetOption small{display:block;color:var(--muted);font-size:9px;margin-top:3px}.widgetOption button{border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:8px;padding:6px 8px;font-size:9px}.sizeRow{display:flex;gap:4px;grid-column:1/-1}.sizeRow button.on{border-color:var(--accent);color:var(--accent)}.identityGrid{display:grid;grid-template-columns:1.15fr .85fr;gap:10px;margin-top:10px}.identityCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.identityHead{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--line)}.identityHead h3{margin:0;font-size:12px}.identityBody{padding:12px}.companySwitch{border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:10px;padding:8px 10px;font-size:10px;max-width:180px}.personRow,.sessionRow,.auditRow2{display:grid;grid-template-columns:1.4fr .8fr .8fr;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:10px}.personRow small,.sessionRow small,.auditRow2 small{display:block;color:var(--muted);font-size:8px;margin-top:2px}.roleBadge{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;background:var(--bg2);font-size:8px}.securityTile{border:1px solid var(--line);border-radius:12px;padding:11px;background:var(--bg2);margin-bottom:8px}.securityTile b,.securityTile small{display:block}.securityTile small{font-size:9px;color:var(--muted);margin-top:3px}.userBtn{border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:50%;width:36px;height:36px;font-size:10px;font-weight:800}.userPopover{position:absolute;right:24px;top:68px;width:240px;border:1px solid var(--line);background:var(--panel);border-radius:14px;box-shadow:0 18px 60px #0008;padding:10px;z-index:40}.userPopover b,.userPopover small{display:block}.userPopover small{font-size:9px;color:var(--muted);margin-top:2px}.userPopover button{width:100%;margin-top:8px}.accountingShell{margin-top:10px}.accountingTabs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}.accountingTabs button{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:9px;padding:7px 10px;font-size:9px}.accountingTabs button.on{color:var(--text);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--panel))}.accountingGrid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:10px}.accCard{border:1px solid var(--line);background:linear-gradient(155deg,var(--panel),var(--panel2));border-radius:15px;overflow:hidden}.accHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.accHead h3{margin:0;font-size:12px}.accBody{padding:12px}.journalLine{display:grid;grid-template-columns:.7fr 1.4fr .8fr .8fr;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:10px}.journalLine.head{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.06em}.journalLine .money{text-align:right;font-variant-numeric:tabular-nums}.balanceBox{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:10px;border:1px solid color-mix(in srgb,var(--ok) 50%,var(--line));border-radius:11px;background:color-mix(in srgb,var(--ok) 5%,var(--panel))}.balanceBox b{color:var(--ok);font-size:11px}.balanceBox small{color:var(--muted);font-size:8px}.periodRow,.accountRow{display:grid;grid-template-columns:1fr .8fr .7fr;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:10px}.periodState{width:max-content;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:8px}.periodState.open{color:var(--ok)}.periodState.locked{color:var(--warn)}.accMetric{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}.accMetric div{border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg2)}.accMetric small,.accMetric b{display:block}.accMetric small{font-size:8px;color:var(--muted)}.accMetric b{font-size:13px;margin-top:4px;font-variant-numeric:tabular-nums}.mobileNav{display:none}.hamb{display:none}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.tr.row:focus-visible{outline-offset:-2px}
@media(max-width:1100px){.app{grid-template-columns:208px minmax(0,1fr)}.workspace{grid-template-columns:1fr}.aiPanel{display:grid;grid-template-columns:1fr 1fr;gap:14px}.kpis{grid-template-columns:repeat(2,1fr)}.widget.s,.widget.m{grid-column:span 6}.widget.l,.widget.xl{grid-column:span 12}.identityGrid,.accountingGrid{grid-template-columns:1fr}}
@media(max-width:760px){.app{display:block;padding-bottom:66px}.customGrid{display:block}.widget{margin-bottom:8px}.widgetCatalog{grid-template-columns:1fr}.companySwitch{max-width:120px}.personRow,.sessionRow,.auditRow2{grid-template-columns:1fr .7fr}.personRow>*:nth-child(3),.sessionRow>*:nth-child(3),.auditRow2>*:nth-child(3){display:none}.journalLine{grid-template-columns:.65fr 1.25fr .75fr}.journalLine>*:nth-child(4){display:none}.accMetric{grid-template-columns:1fr}.sidebar{position:fixed;left:-270px;width:248px;transition:.18s;box-shadow:30px 0 80px #0007}.sidebar.open{left:0}.hamb{display:inline-grid;place-items:center;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:9px;width:36px;height:36px}.topbar{padding:12px 13px;min-height:76px}.headCopy h1{font-size:18px}.headCopy p,.seg,.commandBtn,.avatar{display:none}.content{padding:12px}.hero{align-items:flex-start}.hero h2{font-size:18px}.heroActions .secondary{display:none}.kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.kpi{min-height:92px;padding:10px}.kpi strong{font-size:19px}.workspace{display:block}.aiPanel{display:block;margin-top:8px}.table{min-width:0}.tr{grid-template-columns:1fr .8fr .8fr;gap:7px;padding:9px 10px}.tr.head span:nth-child(2),.tr.head span:nth-child(4),.tr.row span:nth-child(2),.tr.row span:nth-child(4){display:none}.toolbar{flex-wrap:wrap}.search{flex-basis:100%}.mobileNav{display:grid;position:fixed;bottom:0;left:0;right:0;grid-template-columns:repeat(5,1fr);background:color-mix(in srgb,var(--panel) 94%,transparent);backdrop-filter:blur(18px);border-top:1px solid var(--line);z-index:30}.mobileNav button{border:0;background:transparent;color:var(--muted);padding:10px 3px;min-height:56px;font-size:9px}.mobileNav button b{display:block;font-size:15px;color:inherit}.mobileNav button.on{color:var(--accent)}}
`;

function toneClass(t){return "kpi "+t}
function statusChip(value){return <span className="chip">{value}</span>}

const widgetDefs={
 cash:{title:"Denarni tok",desc:"Prihodki, odhodki in trend",size:"l"},
 tasks:{title:"Moje naloge",desc:"Odprte prioritete",size:"m"},
 ai:{title:"AI Copilot",desc:"Predlogi in avtomatizacija",size:"m"},
 deadlines:{title:"Davčni roki",desc:"Roki in tveganja",size:"m"},
 activity:{title:"Aktivnosti",desc:"Revizijska sled",size:"m"},
 receivables:{title:"Terjatve",desc:"Odprte in zapadle postavke",size:"m"}
};
const presets={
 "Podjetnik":["cash","receivables","deadlines","tasks"],
 "Računovodja":["tasks","ai","deadlines","activity","cash","receivables"],
 "DDV":["deadlines","tasks","ai","activity"],
 "Likvidnost":["cash","receivables","tasks"]
};
const defaultLayout=presets["Računovodja"].map(id=>({id,size:widgetDefs[id].size}));

const companies=[
 {id:1,name:"Demo d.o.o.",tax:"SI12345678"},
 {id:2,name:"Studio Delta d.o.o.",tax:"SI87654321"},
 {id:3,name:"C-PARK d.o.o.",tax:"SI24681357"}
];
const teamUsers=[
 {name:"Dalibor Draškovič",email:"dalibor@example.si",role:"Owner",twoFactor:true},
 {name:"Ana Kovač",email:"ana@example.si",role:"Accountant",twoFactor:true},
 {name:"Miha Zupan",email:"miha@example.si",role:"Operator",twoFactor:false},
 {name:"Nina Horvat",email:"nina@example.si",role:"Viewer",twoFactor:false}
];
const sessions=[
 {device:"Chrome · Windows 11",place:"Slovenija",when:"aktivna zdaj"},
 {device:"Safari · iPhone",place:"Slovenija",when:"pred 2 urama"}
];
const securityAudit=[
 {event:"Prijava uspešna",actor:"Dalibor",when:"23:08"},
 {event:"Preklop podjetja",actor:"Dalibor",when:"22:54"},
 {event:"Vloga uporabnika spremenjena",actor:"Admin",when:"včeraj"}
];

function IdentityAccessPanel({company,setCompany,twoFactor,setTwoFactor,light,setLight,compact,setCompact,context}){
 const section=context?.level2??"Podjetje";
 const sub=context?.level3??"Osnovni podatki";
 const card=(title,content)=><section className="identityCard" style={{minWidth:0}}><div className="identityHead"><h3>{title}</h3></div><div className="identityBody">{content}</div></section>;
 return <div style={{display:"grid",gap:10}}>
  <div style={{fontSize:10,color:"var(--muted)"}}>Nastavitve / <b style={{color:"var(--text)"}}>{section} / {sub}</b> · demonstracijsko okolje</div>
  {section==="Podjetje"&&card("Podjetje · "+sub,<>
   <select className="companySwitch" value={company} onChange={e=>setCompany(Number(e.target.value))}>{companies.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
   <div className="securityTile" style={{marginTop:10}}><b>{companies.find(x=>x.id===company)?.name}</b><small>Davčna številka: {companies.find(x=>x.id===company)?.tax}</small></div>
   {sub==="Branding"&&<p style={{fontSize:10,color:"var(--muted)"}}>Nastavitve logotipa in celostne grafične podobe bodo dodane ob povezavi z zaledjem.</p>}
  </>)}
  {section==="Uporabniki"&&card("Uporabniki in vloge · "+sub,<>
   {teamUsers.map(u=><div className="personRow" key={u.email}><div><b>{u.name}</b><small>{u.email}</small></div><span className="roleBadge">{u.role}</span><span style={{color:u.twoFactor?"var(--ok)":"var(--warn)"}}>{u.twoFactor?"2FA":"Priporočena 2FA"}</span></div>)}
   {sub==="Dovoljenja"&&<p style={{fontSize:10,color:"var(--muted)"}}>Dovoljenja se bodo v produkciji določala strežniško po vlogi in podjetju; ta tabela prikazuje samo demo vloge.</p>}
  </>)}
  {section==="Moduli"&&card("Moduli · "+sub,<>
   {nav.map(([label,icon])=><div className="auditRow2" key={label}><div><b>{icon} {label}</b><small>Modul v navigacijskem registru</small></div><span>Demo</span><span className="roleBadge">Predogled</span></div>)}
  </>)}
  {section==="Integracije"&&card("Integracije · "+sub,<>
   <div className="securityTile"><b>{sub}</b><small>Pregled integracije. Dejanska povezava in poverilnice niso nastavljene v tem Next.js demonstracijskem prikazu.</small></div>
  </>)}
  {section==="Videz"&&card("Videz · "+sub,<>
   <div className="securityTile"><b>Tema</b><small>Izberi prikaz za ta demo pogled.</small><button className="secondary" onClick={()=>setLight(v=>!v)} style={{marginTop:8}}>{light?"Preklopi na temno":"Preklopi na svetlo"}</button></div>
   <div className="securityTile" style={{marginTop:9}}><b>Gostota</b><small>Trenutno: {compact?"Kompaktno":"Udobno"}</small><button className="secondary" onClick={()=>setCompact(v=>!v)} style={{marginTop:8}}>Preklopi gostoto</button></div>
   {sub==="Navigacija"&&<div className="securityTile" style={{marginTop:9}}><b>Hierarhija</b><small>Modul → podmodul → dodatni pogled. Končna prilagoditev navigacije ostane predmet širše UX prenove.</small></div>}
  </>)}
  {section==="Varnost"&&sub==="2FA"&&card("Dvofaktorska prijava",<>
   <div className="securityTile"><b>{twoFactor?"Demo 2FA vključena":"Demo 2FA izključena"}</b><small>Sprememba vpliva samo na simulirani prikaz, ne na resnično prijavo.</small><button className="secondary" onClick={()=>setTwoFactor(v=>!v)} style={{marginTop:8}}>Preklopi demo 2FA</button></div>
  </>)}
  {section==="Varnost"&&sub==="Seje"&&card("Aktivne seje",sessions.map(s=><div className="sessionRow" key={s.device}><div><b>{s.device}</b><small>{s.place}</small></div><span>{s.when}</span><span className="roleBadge">Demo</span></div>))}
  {section==="Varnost"&&sub==="Audit"&&card("Varnostna revizijska sled",securityAudit.map((a,i)=><div className="auditRow2" key={i}><div><b>{a.event}</b><small>{a.actor}</small></div><span>{a.when}</span><span className="roleBadge">Demo</span></div>))}
 </div>;
}

const demoJournalLines=[
 {account:"4100",name:"Storitve",debit:"550,00 €",credit:"—"},
 {account:"2601",name:"Vstopni DDV",debit:"121,00 €",credit:"—"},
 {account:"2200",name:"Dobavitelji",debit:"—",credit:"671,00 €"}
];
const demoAccounts=[
 ["1200","Terjatve do kupcev","Saldakonti"],
 ["2200","Obveznosti do dobaviteljev","Saldakonti"],
 ["2601","Vstopni DDV","DDV"],
 ["4100","Stroški storitev","Odhodki"],
 ["7600","Prihodki od storitev","Prihodki"]
];

function AccountingCorePanel({context}){
 const tab=context?.level2??"Temeljnice";
 const [posted,setPosted]=useState(false);
 const [periodLocked,setPeriodLocked]=useState(false);
 return <section className="accountingShell">

   {tab==="Temeljnice"&&<div className="accountingGrid">
     <article className="accCard">
       <div className="accHead"><div><h3>Temeljnica BK-2026-1234</h3><small style={{color:"var(--muted)"}}>01. 11. 2026 · Prejeti račun · MER-2026-04562</small></div><span className={"periodState "+(posted?"locked":"open")}>{posted?"Knjiženo":"Osnutek"}</span></div>
       <div className="accBody">
         <div className="journalLine head"><span>Konto</span><span>Opis</span><span>Breme</span><span>Dobro</span></div>
         {demoJournalLines.map(l=><div className="journalLine" key={l.account}><b>{l.account}</b><span>{l.name}</span><span className="money">{l.debit}</span><span className="money">{l.credit}</span></div>)}
         <div className="balanceBox"><div><b>✓ Temeljnica je uravnotežena</b><small>Breme 671,00 € = Dobro 671,00 €</small></div><button className="primary" disabled={posted||periodLocked} onClick={()=>setPosted(true)}>{posted?"Knjiženo":"Knjiži temeljnico"}</button></div>
       </div>
     </article>
     <aside className="accCard">
       <div className="accHead"><h3>Kontrola knjiženja</h3><span className="roleBadge">double-entry</span></div>
       <div className="accBody">
         <div className="accMetric"><div><small>Breme</small><b>671,00 €</b></div><div><small>Dobro</small><b>671,00 €</b></div><div><small>Razlika</small><b style={{color:"var(--ok)"}}>0,00 €</b></div></div>
         <div className="securityTile"><b>Obdobje 11/2026</b><small>{periodLocked?"Zaklenjeno — nova knjiženja niso dovoljena.":"Odprto za knjiženje."}</small></div>
         <div className="securityTile"><b>AI predlog</b><small>92 % gotovost · 4100 / 2601 / 2200</small></div>
         <button className="secondary" style={{width:"100%"}}>Prikaži revizijsko sled</button>
       </div>
     </aside>
   </div>}

   {tab==="Glavna knjiga"&&<article className="accCard"><div className="accHead"><h3>Glavna knjiga · {context?.level3}</h3></div><div className="accBody">{demoAccounts.map(a=><div className="accountRow" key={a[0]}><b>{a[0]}</b><span>{a[1]}</span><span className="roleBadge">{a[2]}</span></div>)}</div></article>}
   {tab==="Kontni načrt"&&<article className="accCard">
     <div className="accHead"><h3>Kontni načrt</h3><button className="primary">＋ Dodaj konto</button></div>
     <div className="accBody">{demoAccounts.map(a=><div className="accountRow" key={a[0]}><b>{a[0]}</b><span>{a[1]}</span><span className="roleBadge">{a[2]}</span></div>)}</div>
   </article>}

   {tab==="Obdobja"&&<div className="accountingGrid">
     <article className="accCard">
       <div className="accHead"><h3>Poslovno leto 2026</h3><span className="periodState open">Odprto</span></div>
       <div className="accBody">
         {[["09/2026","Zaklenjeno"],["10/2026","Zaklenjeno"],["11/2026",periodLocked?"Zaklenjeno":"Odprto"],["12/2026","Prihodnje"]].map(([p,s])=><div className="periodRow" key={p}><b>{p}</b><span>01.–konec meseca</span><span className={"periodState "+(s==="Odprto"?"open":"locked")}>{s}</span></div>)}
       </div>
     </article>
     <aside className="accCard">
       <div className="accHead"><h3>Zaklep obdobja</h3></div>
       <div className="accBody"><p style={{fontSize:10,color:"var(--muted)",lineHeight:1.55}}>Zaklep prepreči nova knjiženja in spremembe v obdobju. Osnutki morajo biti pred zaklepom razrešeni.</p><button className="primary" style={{width:"100%"}} onClick={()=>setPeriodLocked(v=>!v)}>{periodLocked?"Demo odkleni 11/2026":"Zakleni 11/2026"}</button></div>
     </aside>
   </div>}

   {tab==="Stroškovna mesta"&&<article className="accCard">
     <div className="accHead"><h3>Stroškovna mesta</h3><button className="primary">＋ Novo stroškovno mesto</button></div>
     <div className="accBody">{[["UPRAVA","Uprava"],["PROD","Produkcija"],["PRODAJA","Prodaja"],["MARK","Marketing"]].map(x=><div className="accountRow" key={x[0]}><b>{x[0]}</b><span>{x[1]}</span><span className="periodState open">Aktivno</span></div>)}</div>
   </article>}
 </section>
}

function DashboardWidget({item,onDragStart,onDrop}){
 const d=widgetDefs[item.id];
 const body={
  cash:<><div className="widgetMetric">40.360 €</div><div className="widgetSub">ocenjeni prosti denarni tok · +18,7 %</div><div className="miniBars">{[42,58,46,72,66,88,74,92].map((h,i)=><i key={i} style={{height:h+"%"}}/>)}</div></>,
  tasks:<div className="miniList"><div><span>Prejeti računi</span><b>7</b></div><div><span>Bančne postavke</span><b>3</b></div><div><span>AI predlogi</span><b>24</b></div></div>,
  ai:<><div className="widgetMetric">92 %</div><div className="widgetSub">povprečna gotovost predlogov</div><div className="miniList"><div><span>Za odobritev</span><b>18</b></div><div><span>Samodejno</span><b>16</b></div></div></>,
  deadlines:<div className="miniList"><div><span>DDV-O</span><b>20. 12.</b></div><div><span>REK-O</span><b>18. 12.</b></div><div><span>VIES</span><b>20. 12.</b></div></div>,
  activity:<div className="miniList"><div><span>Račun potrjen</span><b>09:41</b></div><div><span>Knjižba ustvarjena</span><b>09:15</b></div><div><span>DDV kontrola</span><b>09:02</b></div></div>,
  receivables:<><div className="widgetMetric">24.560 €</div><div className="widgetSub">odprte terjatve</div><div className="miniList"><div><span>Zapadlo</span><b>3.240 €</b></div><div><span>Do 7 dni</span><b>6.880 €</b></div></div></>
 }[item.id];
 return <article className={"widget "+item.size} draggable onDragStart={()=>onDragStart(item.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>onDrop(item.id)}>
   <div className="widgetHead"><button className="dragHandle" aria-label="Premakni widget">⋮⋮</button><strong>{d.title}</strong><small>{d.desc}</small></div>
   <div className="widgetBody">{body}</div>
 </article>
}

export default function Page(){
 const [company,setCompany]=useState(1);
 const {
   section,contextLevel2,contextLevel3,activeRoute,
   favorites,isFavorite,navNotice,navigateTo,toggleFavorite,copyCurrentLink,
   hydrateServerPreferences,hasExternalLink
 }=useContextNavigation(company);
 const {light,setLight,compact,setCompact,appearanceReady}=useLocalWorkspaceAppearance(company);
 const {syncStatus,syncMessage}=useWorkspacePreferenceSync({
   company,activeRoute,favorites,hydrateServerPreferences,
   light,setLight,compact,setCompact,appearanceReady,hasExternalLink
 });
 const [drawer,setDrawer]=useState(null);
 const [command,setCommand]=useState(false);
 const [menu,setMenu]=useState(false);
 const [query,setQuery]=useState("");
 const [layout,setLayout]=useState(defaultLayout);
 const [customizer,setCustomizer]=useState(false);
 const [dragId,setDragId]=useState(null);
 const [twoFactor,setTwoFactor]=useState(true);
 const [userPanel,setUserPanel]=useState(false);
 const current=moduleData[section];
 useEffect(()=>{
   try{const saved=localStorage.getItem("finai:workspace:demo-user");if(saved)setLayout(JSON.parse(saved))}catch{}
   const handler=(e)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setCommand(v=>!v)} if(e.key==="Escape"){setCommand(false);setDrawer(null);setMenu(false);setCustomizer(false);setUserPanel(false)}};
   window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)
 },[]);
 useEffect(()=>{try{localStorage.setItem("finai:workspace:demo-user",JSON.stringify(layout))}catch{}},[layout]);
 const applyPreset=(name)=>setLayout(presets[name].map(id=>({id,size:widgetDefs[id].size})));
 const toggleWidget=(id)=>setLayout(items=>items.some(x=>x.id===id)?items.filter(x=>x.id!==id):[...items,{id,size:widgetDefs[id].size}]);
 const setWidgetSize=(id,size)=>setLayout(items=>items.map(x=>x.id===id?{...x,size}:x));
 const dropWidget=(target)=>{if(!dragId||dragId===target)return;setLayout(items=>{const next=[...items];const from=next.findIndex(x=>x.id===dragId),to=next.findIndex(x=>x.id===target);const [moved]=next.splice(from,1);next.splice(to,0,moved);return next});setDragId(null)};
 const rows=useMemo(()=>current.rows.filter(r=>r.join(" ").toLowerCase().includes(query.toLowerCase())),[current,query]);
 const navigateSection=(label)=>{
   navigateTo({moduleLabel:label});
   setMenu(false);
   setQuery("");
 };
 const navigateSubmodule=(view)=>navigateTo({moduleLabel:section,view});
 const navigateSubview=(subview)=>navigateTo({moduleLabel:section,view:contextLevel2,subview});
 const openFavorite=(favorite)=>{
   navigateTo(favorite);
   setMenu(false);
   setQuery("");
 };
 const activeContext=useMemo(()=>({level2:contextLevel2,level3:contextLevel3}),[contextLevel2,contextLevel3]);
 const dashboardOverview=section==="Nadzorna plošča"&&contextLevel2==="Pregled"&&contextLevel3==="Moj pregled";
 const dashboardRows=section==="Nadzorna plošča"?current.rows.filter(r=>{
   if(contextLevel2==="Odobritve")return contextLevel3==="Čaka mene"&&r[4]!=="Zaključeno";
   if(contextLevel2==="Moje naloge")return contextLevel3==="Zamujeno"?false:contextLevel3==="Danes"?r[3]==="Danes":true;
   if(contextLevel2==="Pregled"&&contextLevel3==="Aktivnosti")return true;
   return false;
 }):[];
 const mobile=[["Nadzorna plošča","⌂"],["Prejeti računi","▤"],["Knjiženje","⇄"],["Banka","◇"],["Nastavitve","⚙"]];
 return <div className={"app "+(light?"light ":"")+(compact?"compact":"")}>
   <style>{css}</style>
   <aside className={"sidebar "+(menu?"open":"")}>
     <div className="brand"><div className="logo">F</div><div><b>FinAI Ledger</b><small>Financial intelligence workspace</small></div></div>
     <nav className="nav">{nav.map(([label,icon])=><button key={label} className={section===label?"active":""} onClick={()=>navigateSection(label)}><i>{icon}</i>{label}</button>)}</nav>
     <div className="sideMeta"><span>WORKSPACE</span><b>Demo d.o.o.</b><small>SI12345678 · Slovenija</small></div>
   </aside>

   <section className="shell">
     <header className="topbar">
       <div className="topbarMain">
         <button className="hamb" onClick={()=>setMenu(v=>!v)}>☰</button>
         <div className="headCopy"><h1>{section}</h1><p>{current.subtitle}</p></div>
         <div className="topActions">
           <button className="commandBtn" onClick={()=>setCommand(true)}>Hitri ukazi <kbd>Ctrl K</kbd></button>
           <div className="seg"><button className={!compact?"on":""} onClick={()=>setCompact(false)}>Udobno</button><button className={compact?"on":""} onClick={()=>setCompact(true)}>Kompaktno</button></div>
           <select className="companySwitch" value={company} onChange={e=>setCompany(Number(e.target.value))}>{companies.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
           <button className="themeBtn" onClick={()=>setLight(v=>!v)}>{light?"☾":"☀"}</button>
           <button className="iconBtn">♢</button>
           <button className="userBtn" onClick={()=>setUserPanel(v=>!v)}>DD</button>
         </div>
       </div>
       <ContextNavigation moduleLabel={section} level2={contextLevel2} onLevel2={navigateSubmodule} level3={contextLevel3} onLevel3={navigateSubview}/>
     </header>

     <main className="content">
       <div className="hero">
         <div><small>FINAI WORKSPACE · 01. NOV 2026</small><h2>{section==="Nadzorna plošča"?"Finančni pregled brez šuma":contextLevel2??"Delovni prostor"}</h2><p>{section==="Nadzorna plošča"?"Ključne informacije so takoj vidne; podrobnosti ostanejo en klik stran.":`${section} / ${contextLevel2 ?? "Pregled"}${contextLevel3?" / "+contextLevel3:""}`}</p></div>
         <div className="heroActions">{section==="Nadzorna plošča"&&<button className="secondary" onClick={()=>setCustomizer(true)}>⚙ Uredi pogled</button>}<button className="secondary" onClick={()=>setCommand(true)}>⌘ Ukazi</button><button className="primary" onClick={()=>setDrawer(current.rows[0])}>＋ Novo dejanje</button></div>
       </div>

       <div className="contextQuickAccess" aria-label="Hitri dostop do podpogledov">
         <button type="button" className={"contextQuickAction "+(isFavorite?"saved":"")} aria-pressed={isFavorite} onClick={toggleFavorite} title={isFavorite?"Odstrani med priljubljenimi":"Dodaj med priljubljene"}>
           {isFavorite?"★ Priljubljeno":"☆ Pripni pogled"}
         </button>
         <button type="button" className="contextQuickAction" onClick={copyCurrentLink} title="Kopiraj neposredno povezavo do tega podpogleda">⧉ Kopiraj povezavo</button>
         {favorites.length>0&&<nav className="contextFavoriteList" aria-label="Priljubljeni podpogledi">
           {favorites.map(item=><button type="button" key={[item.module,item.view,item.subview].join("::")} className="contextFavorite" aria-current={item.module===activeRoute.module&&item.view===activeRoute.view&&item.subview===activeRoute.subview?"page":undefined} title={modules.find(m=>m.key===item.module)?.label+" / "+item.view+" / "+item.subview} onClick={()=>openFavorite(item)}>
             <span>★</span> {modules.find(m=>m.key===item.module)?.label} · {item.view} · {item.subview}
           </button>)}
         </nav>}
         {navNotice&&<span role="status" className="contextQuickNotice">{navNotice}</span>}
         <span className={"contextSyncState "+syncStatus} role="status" title={syncMessage||"Način shranjevanja uporabniških nastavitev"}>
           {syncStatus==="local"?"Samo ta brskalnik":
            syncStatus==="synced"?"✓ Sinhronizirano":
            syncStatus==="saving"?"Shranjujem ...":
            syncStatus==="connecting"?"Povezujem ...":
            syncStatus==="blocked"?"Zahtevana prijava":
            syncStatus==="conflict"?"Neskladje med sejami":"Lokalno · strežnik nedosegljiv"}
         </span>
       </div>

       <div className="kpis">{current.stats.map(([a,b,c,t])=><article className={toneClass(t)} key={a}><div className="kpiTop"><small>{a}</small><span className="dot"/></div><strong>{b}</strong><em>{c}</em></article>)}</div>

       {dashboardOverview&&<div className="customGrid">{layout.map(item=><DashboardWidget key={item.id} item={item} onDragStart={setDragId} onDrop={dropWidget}/>)}</div>}
       {section==="Nadzorna plošča"&&!dashboardOverview&&<article className="panel" style={{marginBottom:10}}>
         <div className="panelHead"><h3>{contextLevel2} · {contextLevel3}</h3><span>Demo prikaz · {dashboardRows.length} opravil</span></div>
         {contextLevel2==="Analitika"?<div className="kpis" style={{padding:12}}>{current.stats.filter(([a])=>
           contextLevel3==="Finance"?/Bančne|Roki/.test(a):
           contextLevel3==="Prodaja"?/Računi/.test(a):
           /AI|Računi/.test(a)).map(([a,b,d,t])=><article className={toneClass(t)} key={a}><div className="kpiTop"><small>{a}</small></div><strong>{b}</strong><em>{d}</em></article>)}</div>
         :contextLevel2==="Pregled"&&contextLevel3==="KPI"?<p style={{padding:14,fontSize:10,color:"var(--muted)"}}>Ključni kazalniki so prikazani v karticah zgoraj. Prilagajanje kartic je na voljo v pogledu »Moj pregled«.</p>
         :<div className="tableWrap"><div className="table"><div className="tr head"><span>Postavka</span><span>Kontekst</span><span>Vrednost</span><span>Datum</span><span>Prioriteta</span></div>
           {dashboardRows.map((row,i)=><button className="tr row" key={i} onClick={()=>setDrawer(row)}>{row.map((value,j)=><span key={j}>{value}</span>)}</button>)}
           {!dashboardRows.length&&<p style={{padding:14,fontSize:10,color:"var(--muted)"}}>Za izbrani pogled ni opravil v demonstracijskih podatkih.</p>}
         </div></div>}
       </article>}
       {section==="Nastavitve"&&<IdentityAccessPanel company={company} setCompany={setCompany} twoFactor={twoFactor} setTwoFactor={setTwoFactor} light={light} setLight={setLight} compact={compact} setCompact={setCompact} context={activeContext}/>}
       {section==="Knjiženje"&&<AccountingCorePanel context={activeContext}/>}
       {section==="Partnerji"&&<PartnerWorkspace context={activeContext}/>}
       {section==="Prejeti računi"&&<IncomingInvoicesWorkspace context={activeContext}/>}
       {section==="Izdani računi"&&<IssuedInvoicesWorkspace context={activeContext}/>}
       {section==="Banka"&&<BankingWorkspace context={activeContext}/>}
       {section==="DDV in poročila"&&<VatWorkspace context={activeContext}/>}
       {section==="eDavki / FURS"&&<EdavkiWorkspace context={activeContext}/>}
       {section==="Dokumenti"&&<DocumentsWorkspace context={activeContext}/>}
       {section==="Artikli in ceniki"&&<CatalogWorkspace context={activeContext}/>}
       {section==="CRM"&&<CrmWorkspace context={activeContext}/>}
       {section==="Ponudbe"&&<QuotesWorkspace context={activeContext}/>}
       {section==="Naročila"&&<SalesOrdersWorkspace context={activeContext}/>}
       {section==="Nabava"&&<ProcurementWorkspace context={activeContext}/>}
       {section==="Zaloge"&&<InventoryWorkspace context={activeContext}/>}
       {section==="Projekti"&&<ProjectsWorkspace context={activeContext}/>}

       {(section!=="Nadzorna plošča"||dashboardOverview)&&section!=="Knjiženje"&&section!=="Partnerji"&&section!=="Prejeti računi"&&section!=="Izdani računi"&&section!=="Banka"&&section!=="DDV in poročila"&&section!=="eDavki / FURS"&&section!=="Dokumenti"&&section!=="Artikli in ceniki"&&section!=="CRM"&&section!=="Ponudbe"&&section!=="Naročila"&&section!=="Nabava"&&section!=="Zaloge"&&section!=="Projekti"&&<div className="workspace">
         <article className="panel">
           <div className="panelHead"><h3>{section==="Nadzorna plošča"?"Prioritete in odprte naloge":"Podatki"}</h3><span>{rows.length} zapisov · posodobljeno zdaj</span></div>
           <div className="toolbar"><input className="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Išči po partnerju, dokumentu, znesku ali statusu ..."/><button className="secondary">Filtri</button><button className="secondary">Izvoz</button></div>
           <div className="tableWrap"><div className="table">
             <div className="tr head"><span>Postavka</span><span>Kontekst</span><span>Vrednost</span><span>AI / datum</span><span>Status</span></div>
             {rows.map((r,i)=><button className="tr row" key={i} onClick={()=>setDrawer(r)}>{r.map((v,j)=><span key={j} className={j===2?"num":""}>{j===4?statusChip(v):v}</span>)}</button>)}
           </div></div>
         </article>

         <aside className="panel aiPanel">
           <div>
             <div className="aiHead"><div className="orb">AI</div><div><small>FINAI COPILOT</small><h3>Predlog je pripravljen</h3></div></div>
             <p>FinAI povezuje pravila podjetja, pretekle potrditve in računovodski kontekst. Predlog je razložljiv in vedno ostane sledljiv.</p>
             <div className="confidence"><div className="confidenceTop"><span>Gotovost predloga</span><b>92 %</b></div><div className="bar"><i/></div></div>
             <button className="primary" style={{width:"100%"}} onClick={()=>setDrawer(["AI predlog","Kontiranje","92 %","danes","Čaka odobritev"])}>Preglej utemeljitev</button>
           </div>
           <div className="audit">
             <div><i>✓</i><span><b>Račun potrjen</b><small>Janez Novak · 09:41</small></span></div>
             <div><i>AI</i><span><b>Predlog knjižbe ustvarjen</b><small>FinAI · 09:15</small></span></div>
             <div><i>↗</i><span><b>DDV kontrola zaključena</b><small>Sistem · 09:02</small></span></div>
           </div>
         </aside>
       </div>}
     </main>
   </section>

   {userPanel&&<div className="userPopover"><b>Dalibor Draškovič</b><small>Owner · {companies.find(x=>x.id===company)?.name}</small><button className="secondary" onClick={()=>{navigateSection("Nastavitve");setUserPanel(false)}}>Varnost in dostopi</button><button className="secondary">Odjava</button></div>}

   <div className={"drawer "+(drawer?"open":"")}>
     <div className="drawerHead"><div><small style={{color:"var(--accent)",fontWeight:800}}>KONTEKSTNI PREDAL</small><h3>{drawer?.[0]||"Podrobnosti"}</h3></div><button className="drawerClose" onClick={()=>setDrawer(null)}>×</button></div>
     {drawer&&<><div className="drawerMeta"><div><small>Kontekst</small><b>{drawer[1]}</b></div><div><small>Vrednost</small><b>{drawer[2]}</b></div><div><small>AI / datum</small><b>{drawer[3]}</b></div><div><small>Status</small><b>{drawer[4]}</b></div></div>
     <div className="drawerSection"><h4>AI razlaga</h4><p style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>Predlog temelji na potrjenih preteklih vnosih, pravilih podjetja in trenutnem računovodskem kontekstu. Pred knjiženjem je na voljo pregled vseh postavk.</p></div>
     <div className="drawerSection"><h4>Hitra dejanja</h4><div style={{display:"grid",gap:8}}><button className="primary">Odobri in nadaljuj</button><button className="secondary">Odpri celoten zapis</button><button className="secondary">Prikaži revizijsko sled</button></div></div></>}
   </div>

   {customizer&&<div className="customizer" onMouseDown={e=>{if(e.target===e.currentTarget)setCustomizer(false)}}><div className="customBox">
     <div className="customHead"><div><small style={{color:"var(--accent)",fontWeight:800}}>PERSONALIZACIJA</small><h3>Uredi glavni pogled</h3></div><button className="drawerClose" onClick={()=>setCustomizer(false)}>×</button></div>
     <div className="customBody">
       <div className="presetRow">{Object.keys(presets).map(name=><button className="secondary" key={name} onClick={()=>applyPreset(name)}>{name}</button>)}<button className="secondary" onClick={()=>setLayout(defaultLayout)}>Ponastavi</button></div>
       <div className="widgetCatalog">{Object.entries(widgetDefs).map(([id,d])=>{const item=layout.find(x=>x.id===id);return <div className="widgetOption" key={id}><div><b>{d.title}</b><small>{d.desc}</small></div><button onClick={()=>toggleWidget(id)}>{item?"Skrij":"Dodaj"}</button>{item&&<div className="sizeRow"><span style={{fontSize:9,color:"var(--muted)",padding:"6px 4px"}}>Velikost:</span>{["s","m","l","xl"].map(size=><button className={item.size===size?"on":""} key={size} onClick={()=>setWidgetSize(id,size)}>{size.toUpperCase()}</button>)}</div>}</div>})}</div>
       <p style={{fontSize:10,color:"var(--muted)",marginBottom:0}}>Postavitev se v tem MVP-ju shrani lokalno za uporabnika. V produkciji se bo shranjevala v uporabniški profil v bazi.</p>
     </div>
   </div></div>}

   {command&&<div className="command" onMouseDown={e=>{if(e.target===e.currentTarget)setCommand(false)}}><div className="commandBox"><input autoFocus placeholder="Vpiši ukaz ali modul ..." onKeyDown={e=>{if(e.key==="Enter")setCommand(false)}}/><div className="commandList">{nav.slice(0,6).map(([label,icon])=><button key={label} onClick={()=>{navigateSection(label);setCommand(false)}}>{icon} &nbsp; Odpri {label}</button>)}</div></div></div>}

   <nav className="mobileNav">{mobile.map(([label,icon])=><button key={label} className={section===label?"on":""} onClick={()=>navigateSection(label)}><b>{icon}</b>{label.split(" ")[0]}</button>)}</nav>
 </div>
}
