"use client";
import {useEffect,useMemo,useState} from "react";

const nav=[
["Nadzorna plošča","⌂"],["Prejeti računi","▤"],["Izdani računi","▧"],["Knjiženje","⇄"],
["Banka","◇"],["DDV in poročila","%"],["eDavki / FURS","↗"],["Partnerji","◎"],["Dokumenti","▣"],["Nastavitve","⚙"]
];

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
.shell{min-width:0}.topbar{min-height:92px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:14px;padding:17px 24px;position:sticky;top:0;z-index:15;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(18px)}
.headCopy h1{margin:0;font-size:24px;letter-spacing:-.035em}.headCopy p{margin:5px 0 0;color:var(--muted);font-size:11px}.topActions{margin-left:auto;display:flex;align-items:center;gap:8px}.seg{display:flex;border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:3px}.seg button{border:0;background:transparent;color:var(--muted);font-size:10px;padding:6px 8px;border-radius:7px}.seg button.on{background:color-mix(in srgb,var(--accent) 12%,var(--panel));color:var(--text)}
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
.mobileNav{display:none}.hamb{display:none}button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.tr.row:focus-visible{outline-offset:-2px}
@media(max-width:1100px){.app{grid-template-columns:208px minmax(0,1fr)}.workspace{grid-template-columns:1fr}.aiPanel{display:grid;grid-template-columns:1fr 1fr;gap:14px}.kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){.app{display:block;padding-bottom:66px}.sidebar{position:fixed;left:-270px;width:248px;transition:.18s;box-shadow:30px 0 80px #0007}.sidebar.open{left:0}.hamb{display:inline-grid;place-items:center;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:9px;width:36px;height:36px}.topbar{padding:12px 13px;min-height:76px}.headCopy h1{font-size:18px}.headCopy p,.seg,.commandBtn,.avatar{display:none}.content{padding:12px}.hero{align-items:flex-start}.hero h2{font-size:18px}.heroActions .secondary{display:none}.kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.kpi{min-height:92px;padding:10px}.kpi strong{font-size:19px}.workspace{display:block}.aiPanel{display:block;margin-top:8px}.table{min-width:0}.tr{grid-template-columns:1fr .8fr .8fr;gap:7px;padding:9px 10px}.tr.head span:nth-child(2),.tr.head span:nth-child(4),.tr.row span:nth-child(2),.tr.row span:nth-child(4){display:none}.toolbar{flex-wrap:wrap}.search{flex-basis:100%}.mobileNav{display:grid;position:fixed;bottom:0;left:0;right:0;grid-template-columns:repeat(5,1fr);background:color-mix(in srgb,var(--panel) 94%,transparent);backdrop-filter:blur(18px);border-top:1px solid var(--line);z-index:30}.mobileNav button{border:0;background:transparent;color:var(--muted);padding:10px 3px;min-height:56px;font-size:9px}.mobileNav button b{display:block;font-size:15px;color:inherit}.mobileNav button.on{color:var(--accent)}}
`;

function toneClass(t){return "kpi "+t}
function statusChip(value){return <span className="chip">{value}</span>}

export default function Page(){
 const [section,setSection]=useState("Nadzorna plošča");
 const [light,setLight]=useState(false);
 const [compact,setCompact]=useState(false);
 const [drawer,setDrawer]=useState(null);
 const [command,setCommand]=useState(false);
 const [menu,setMenu]=useState(false);
 const [query,setQuery]=useState("");
 const current=moduleData[section];
 useEffect(()=>{
   const handler=(e)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setCommand(v=>!v)} if(e.key==="Escape"){setCommand(false);setDrawer(null);setMenu(false)}};
   window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)
 },[]);
 const rows=useMemo(()=>current.rows.filter(r=>r.join(" ").toLowerCase().includes(query.toLowerCase())),[current,query]);
 const mobile=[["Nadzorna plošča","⌂"],["Prejeti računi","▤"],["Knjiženje","⇄"],["Banka","◇"],["Nastavitve","⚙"]];
 return <div className={"app "+(light?"light ":"")+(compact?"compact":"")}>
   <style>{css}</style>
   <aside className={"sidebar "+(menu?"open":"")}>
     <div className="brand"><div className="logo">F</div><div><b>FinAI Ledger</b><small>Financial intelligence workspace</small></div></div>
     <nav className="nav">{nav.map(([label,icon])=><button key={label} className={section===label?"active":""} onClick={()=>{setSection(label);setMenu(false);setQuery("")}}><i>{icon}</i>{label}</button>)}</nav>
     <div className="sideMeta"><span>WORKSPACE</span><b>Demo d.o.o.</b><small>SI12345678 · Slovenija</small></div>
   </aside>

   <section className="shell">
     <header className="topbar">
       <button className="hamb" onClick={()=>setMenu(v=>!v)}>☰</button>
       <div className="headCopy"><h1>{section}</h1><p>{current.subtitle}</p></div>
       <div className="topActions">
         <button className="commandBtn" onClick={()=>setCommand(true)}>Hitri ukazi <kbd>Ctrl K</kbd></button>
         <div className="seg"><button className={!compact?"on":""} onClick={()=>setCompact(false)}>Udobno</button><button className={compact?"on":""} onClick={()=>setCompact(true)}>Kompaktno</button></div>
         <button className="themeBtn" onClick={()=>setLight(v=>!v)}>{light?"☾":"☀"}</button>
         <button className="iconBtn">♢</button>
         <div className="avatar">DD</div>
       </div>
     </header>

     <main className="content">
       <div className="hero">
         <div><small>FINAI WORKSPACE · 01. NOV 2026</small><h2>{section==="Nadzorna plošča"?"Finančni pregled brez šuma":"Delovni prostor"}</h2><p>{section==="Nadzorna plošča"?"Ključne informacije so takoj vidne; podrobnosti ostanejo en klik stran.":"Hitro delo z visoko gostoto podatkov in jasnim kontekstom."}</p></div>
         <div className="heroActions"><button className="secondary" onClick={()=>setCommand(true)}>⌘ Ukazi</button><button className="primary" onClick={()=>setDrawer(current.rows[0])}>＋ Novo dejanje</button></div>
       </div>

       <div className="kpis">{current.stats.map(([a,b,c,t])=><article className={toneClass(t)} key={a}><div className="kpiTop"><small>{a}</small><span className="dot"/></div><strong>{b}</strong><em>{c}</em></article>)}</div>

       <div className="workspace">
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
       </div>
     </main>
   </section>

   <div className={"drawer "+(drawer?"open":"")}>
     <div className="drawerHead"><div><small style={{color:"var(--accent)",fontWeight:800}}>KONTEKSTNI PREDAL</small><h3>{drawer?.[0]||"Podrobnosti"}</h3></div><button className="drawerClose" onClick={()=>setDrawer(null)}>×</button></div>
     {drawer&&<><div className="drawerMeta"><div><small>Kontekst</small><b>{drawer[1]}</b></div><div><small>Vrednost</small><b>{drawer[2]}</b></div><div><small>AI / datum</small><b>{drawer[3]}</b></div><div><small>Status</small><b>{drawer[4]}</b></div></div>
     <div className="drawerSection"><h4>AI razlaga</h4><p style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>Predlog temelji na potrjenih preteklih vnosih, pravilih podjetja in trenutnem računovodskem kontekstu. Pred knjiženjem je na voljo pregled vseh postavk.</p></div>
     <div className="drawerSection"><h4>Hitra dejanja</h4><div style={{display:"grid",gap:8}}><button className="primary">Odobri in nadaljuj</button><button className="secondary">Odpri celoten zapis</button><button className="secondary">Prikaži revizijsko sled</button></div></div></>}
   </div>

   {command&&<div className="command" onMouseDown={e=>{if(e.target===e.currentTarget)setCommand(false)}}><div className="commandBox"><input autoFocus placeholder="Vpiši ukaz ali modul ..." onKeyDown={e=>{if(e.key==="Enter")setCommand(false)}}/><div className="commandList">{nav.slice(0,6).map(([label,icon])=><button key={label} onClick={()=>{setSection(label);setCommand(false)}}>{icon} &nbsp; Odpri {label}</button>)}</div></div></div>}

   <nav className="mobileNav">{mobile.map(([label,icon])=><button key={label} className={section===label?"on":""} onClick={()=>setSection(label)}><b>{icon}</b>{label.split(" ")[0]}</button>)}</nav>
 </div>
}
