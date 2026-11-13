"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const protocol = "finai.offline.v1";
const css = [
  ".offline{min-height:100vh;color:#edf8ff;background:radial-gradient(ellipse at 85% 0%,#1b466450,transparent 45%),#081522;font-family:Inter,system-ui,Segoe UI,sans-serif;padding:40px 24px}",
  ".offline *{box-sizing:border-box}.offline a{color:#83e7d4;text-decoration:none}",
  ".offline .wrap{max-width:1040px;margin:0 auto}.offline .bar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:66px}",
  ".offline .brand{font-size:22px;font-weight:760;letter-spacing:-.6px}.offline .brand em{color:#80e8d5;font-style:normal}",
  ".offline .pill{border:1px solid #497665;color:#95e9d8;border-radius:40px;padding:9px 14px;font-size:12px}",
  ".offline h1{font-size:clamp(36px,5vw,60px);line-height:1.05;letter-spacing:-.05em;margin:12px 0 20px}",
  ".offline .intro{color:#9eb7c9;max-width:670px;line-height:1.75;font-size:15px}",
  ".offline .eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:#83e7d4;font-weight:750}",
  ".offline .grid{margin-top:38px;display:grid;grid-template-columns:1fr 1fr;gap:20px}",
  ".offline .panel{background:linear-gradient(140deg,#172d42,#0c1c2d);border:1px solid #294a5c;border-radius:17px;padding:27px}",
  ".offline h2{font-size:19px;letter-spacing:-.4px;margin:0 0 16px}.offline label{display:block;color:#cfe5ef;font-size:12px;font-weight:700;margin:20px 0 8px}",
  ".offline input,.offline textarea{width:100%;background:#091725;color:#edf8ff;border:1px solid #375367;border-radius:9px;font:inherit;font-size:14px;padding:13px;outline-color:#87ebd6}",
  ".offline textarea{resize:vertical;min-height:132px}.offline button{border:0;cursor:pointer;background:#8cebd8;color:#102630;border-radius:9px;font:inherit;font-size:13px;font-weight:750;padding:13px 18px}",
  ".offline button:disabled{opacity:.55;cursor:not-allowed}.offline button.ghost{padding:7px 10px;border:1px solid #506877;color:#cde4ec;background:transparent}",
  ".offline .draft{border-top:1px solid #294b5b;padding:17px 0}.offline .draft strong{font-size:14px}.offline .draft p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.65;color:#a7bed0}",
  ".offline .draft .meta{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:11px;color:#8ba7b6}.offline .muted{color:#91abba;font-size:13px;line-height:1.7}",
  ".offline .message{margin-top:20px;color:#9cebd9;font-size:13px;min-height:20px}",
  ".offline .footer{margin-top:45px;border-top:1px solid #294351;padding-top:22px;color:#849fae;font-size:12px;line-height:1.6}",
  "@media(max-width:750px){.offline .grid{grid-template-columns:1fr}.offline .bar{margin-bottom:42px}.offline .panel{padding:20px}}"
].join("");

/** Offline-only first proof: native host owns encrypted SQLite; no remote calls. */
export default function OfflinePage() {
  const [connected, setConnected] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [queueCompany,setQueueCompany] = useState("1");
  const [queueItems,setQueueItems] = useState([]);
  const [queueBusy,setQueueBusy] = useState(false);
  const [queueMessage,setQueueMessage] = useState("");
  const [importedMobile,setImportedMobile] = useState(null);
  const pending = useRef(new Map());

  function send(type, data = {}) {
    const api = typeof window !== "undefined" ? window.chrome?.webview : undefined;
    if (!api) return Promise.reject(new Error("Namizna aplikacija ni aktivna."));
    const requestId = (globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + String(Math.random())).replaceAll("-", "");
    return new Promise((resolve, reject) => {
      pending.current.set(requestId, { resolve, reject });
      api.postMessage({ protocol, requestId, type, ...data });
    });
  }

  async function refresh() {
    try {
      const response = await send("draft.list");
      if (!response.ok) throw new Error("Read failed");
      setDrafts(response.drafts ?? []);
      setMessage("");
    } catch {
      setMessage("Lokalni osnutki trenutno niso dosegljivi.");
    }
  }

  async function refreshQueue(companyId) {
    try{
      const result=await send("queue.list",{companyId});
      if(!result.ok)throw new Error("Local queue unavailable");
      setQueueItems(result.entries??[]);
    }catch{
      setQueueItems([]);
      setQueueMessage("Testna vrsta ni dosegljiva.");
    }
  }
  async function refreshImported(companyId){
    try{
      const result=await send("queue.imported-list",{companyId});
      if(!result.ok)throw new Error("Import unreadable");
      setImportedMobile(result.entry??null);
    }catch{setImportedMobile(null);setQueueMessage("Uvožene mobilne kopije ni mogoče preveriti.");}
  }
  async function importEncryptedMobile(){
    if(queueBusy)return;
    setQueueBusy(true);setQueueMessage("");
    try{
      const result=await send("queue.import-mobile",{companyId:queueCompany});
      if(!result.ok)throw new Error("Native import rejected");
      if(!result.cancelled){
        await refreshImported(queueCompany);
        setQueueMessage("Šifrirana sintetična mobilna ovojnica je ročno uvožena in zaščitena z Windows DPAPI. Ni dešifrirana ali poslana v oblak.");
      }
    }catch{setQueueMessage("Uvoz je zavrnjen. Dovoljeni so samo pravilni šifrirani demo dogodki izbranega podjetja.");}
    finally{setQueueBusy(false);}
  }
  async function removeImportedMobile(){
    if(!importedMobile||!window.confirm("Odstranim samo Windows kopijo uvoženega šifriranega dogodka?"))return;
    try{
      const result=await send("queue.imported-delete",{companyId:queueCompany,eventId:importedMobile.EventId});
      if(!result.ok||!result.deleted)throw new Error("Remove rejected");
      await refreshImported(queueCompany);
      setQueueMessage("Uvožena šifrirana mobilna kopija je odstranjena samo iz Windows shrambe.");
    }catch{setQueueMessage("Uvožene kopije ni mogoče odstraniti.");}
  }
  async function addQueueItem(){
    if(queueBusy)return;
    setQueueBusy(true);setQueueMessage("");
    try{
      const result=await send("queue.create",{companyId:queueCompany});
      if(!result.ok)throw new Error("Queue refused");
      await refreshQueue(queueCompany);
      setQueueMessage("Sintetična dobavnica je šifrirano shranjena samo na tej napravi. Samodejne sinhronizacije ni.");
    }catch{setQueueMessage("Shranjevanje testne dobavnice ni uspelo.");}
    finally{setQueueBusy(false);}
  }
  async function removeQueueItem(id){
    if(!window.confirm("Izbrišem to lokalno sintetično dobavnico iz vrste?"))return;
    try{
      const result=await send("queue.delete",{companyId:queueCompany,id});
      if(!result.ok)throw new Error("Delete refused");
      await refreshQueue(queueCompany);
      setQueueMessage("Odstranjena je samo testna dobavnica izbranega podjetja.");
    }catch{setQueueMessage("Brisanje testne dobavnice ni uspelo.");}
  }
  useEffect(() => {
    const bridge = window.chrome?.webview;
    if (!bridge) return;
    const onMessage = (event) => {
      const result = event.data;
      if (!result || result.protocol !== protocol) return;
      const callback = pending.current.get(result.requestId);
      if (!callback) return;
      pending.current.delete(result.requestId);
      callback.resolve(result.payload);
    };
    bridge.addEventListener("message", onMessage);
    setConnected(true);
    send("offline.status").then((result) => {
      if (result?.ok && result.local) return Promise.all([refresh(),refreshQueue("1"),refreshImported("1")]);
      setMessage("Lokalno shranjevanje ni pripravljeno.");
    }).catch(() => setMessage("Lokalno shranjevanje ni dosegljivo."));
    return () => {
      bridge.removeEventListener("message", onMessage);
      for (const item of pending.current.values()) item.reject(new Error("Okno zaprto"));
      pending.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(event) {
    event.preventDefault();
    if (!title.trim() || title.length > 120 || note.length > 4000) {
      setMessage("Vnesi naslov do 120 znakov in besedilo do 4000 znakov.");
      return;
    }
    try {
      const response = await send("draft.create", { title, note });
      if (!response.ok) throw new Error("Save refused");
      setTitle("");
      setNote("");
      await refresh();
      setMessage("Osnutek je varno shranjen lokalno, brez internetne povezave.");
    } catch {
      setMessage("Shranjevanje ni uspelo. Podatki niso bili poslani na strežnik.");
    }
  }

  async function remove(id) {
    if (!window.confirm("Želiš trajno izbrisati ta lokalni testni osnutek?")) return;
    try {
      const response = await send("draft.delete", { id });
      if (!response.ok) throw new Error("Delete refused");
      await refresh();
      setMessage("Lokalni osnutek je izbrisan.");
    } catch {
      setMessage("Brisanje ni uspelo.");
    }
  }

  return (
    <main className="offline">
      <style>{css}</style>
      <div className="wrap">
        <header className="bar">
          <div className="brand">e-<em>integrator</em> <span style={{fontWeight:400,color:"#90adbf",fontSize:13}}> / FinAI</span></div>
          <div className="pill">{connected ? "● Lokalna povezava aktivna" : "Predogled · namizni način"}</div>
        </header>
        <div className="eyebrow">Samostojna namizna različica · OFFLINE-01</div>
        <h1>FinAI deluje tudi<br/>brez interneta.</h1>
        <p className="intro">To je prvi lokalni prototip. Osnutki se shranjujejo v SQLite zbirko na tvojem računalniku in so zaščiteni s šifriranjem Windows. Za njihovo ustvarjanje, ponovno odpiranje in brisanje ni potrebna internetna povezava.</p>
        <div className="grid">
          <section className="panel">
            <h2>Nov lokalni osnutek</h2>
            <p className="muted">Za zdaj samo preizkusni zapiski. Knjižbe, računi, davčna poročila in sinhronizacija bodo omogočeni po ločenih varnostnih in računovodskih testih.</p>
            <form onSubmit={create}>
              <label htmlFor="draft-title">Naslov</label>
              <input id="draft-title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} required placeholder="Primer: testni osnutek" disabled={!connected}/>
              <label htmlFor="draft-note">Besedilo osnutka</label>
              <textarea id="draft-note" value={note} onChange={e=>setNote(e.target.value)} maxLength={4000} placeholder="Zapiši preizkusno besedilo..." disabled={!connected}/>
              <div style={{marginTop:20}}><button type="submit" disabled={!connected}>Shrani lokalno</button></div>
            </form>
            <div role="status" className="message">{message}</div>
          </section>
          <section className="panel">
            <h2>Shranjeni osnutki ({drafts.length})</h2>
            {!connected && <p className="muted">Ta funkcija potrebuje namizni program za Windows; običajni spletni brskalnik ne more dostopati do lokalne zbirke.</p>}
            {connected && drafts.length === 0 && <p className="muted">Ni lokalnih osnutkov. Shrani prvega, zapri aplikacijo in jo ponovno odpri: osnutek bo ostal na računalniku.</p>}
            {drafts.map(draft => <article className="draft" key={draft.Id}>
              <strong>{draft.Title}</strong>
              <p>{draft.Note}</p>
              <div className="meta"><span>{new Date(draft.UpdatedAt).toLocaleString("sl-SI")}</span><button type="button" className="ghost" onClick={()=>remove(draft.Id)}>Izbriši</button></div>
            </article>)}
          </section>
        </div>
        <section className="panel" aria-label="Šifrirana lokalna vrsta dobavnic" style={{marginTop:20}}>
          <h2>Terenska dobavnica – lokalna testna vrsta</h2>
          <p className="muted">Primer za Windows namizno aplikacijo. Dobavnice so sintetične in šifrirane z DPAPI.
            Ni prenosa v oblak, podpisovanja, izdaje računa ali sinhronizacije.
            Za vsako podjetje je na voljo ločen vzorec.</p>
          <label htmlFor="queue-company">Demonstracijsko podjetje</label>
          <select id="queue-company" aria-label="Podjetje testne dobavnice" value={queueCompany}
            disabled={!connected||queueBusy}
            onChange={async e=>{
              const companyId=e.target.value;
              setQueueCompany(companyId);setQueueItems([]);setImportedMobile(null);setQueueMessage("");
              await Promise.all([refreshQueue(companyId),refreshImported(companyId)]);
            }} style={{padding:"12px",background:"#091725",color:"#edf8ff",border:"1px solid #375367",borderRadius:9,minWidth:180}}>
            <option value="1">Podjetje A</option>
            <option value="2">Podjetje B</option>
            <option value="3">Podjetje C</option>
          </select>
          <div style={{marginTop:12}}>
            <button type="button" disabled={!connected||queueBusy} onClick={addQueueItem}>
              {queueBusy?"Shranjujem …":"Dodaj sintetično dobavnico v vrsto"}
            </button>
          </div>
          <div role="status" className="message">{queueMessage}</div>
          {queueItems.length===0&&<p className="muted">Za izbrano podjetje v testni vrsti ni dobavnic.</p>}
          {queueItems.map(item=><article className="draft" key={item.Id}>
            <strong>{item.DocumentId}</strong>
            <p>Čaka samo lokalno · brez avtomatskega prenosa</p>
            <div className="meta">
              <span>{new Date(item.CreatedUtc).toLocaleString("sl-SI")}</span>
              <button type="button" className="ghost" onClick={()=>removeQueueItem(item.Id)}>Odstrani iz vrste</button>
            </div>
          </article>)}
          <div style={{marginTop:22,paddingTop:18,borderTop:"1px solid #294b5b"}}>
            <h3>Uvoz šifriranega mobilnega demo dogodka</h3>
            <p className="muted">Prenesi šifrirano vrsto iz mobilnega /field/ in jo ročno izberi v Windows aplikaciji. Uvoz je omejen na sintetično podjetje; shramba je zaščitena z DPAPI. To ni preverjen elektronski podpis ali sinhronizacija.</p>
            <button type="button" disabled={!connected||queueBusy} onClick={importEncryptedMobile}>Uvozi šifrirano mobilno vrsto (JSON)</button>
            {importedMobile?<article className="draft">
              <strong>{importedMobile.DocumentId}</strong>
              <p>Uvoženo, a brez dešifriranja · {importedMobile.State} · UUID: {importedMobile.EventId}</p>
              <button type="button" className="ghost" disabled={queueBusy} onClick={removeImportedMobile}>Odstrani uvoženi dogodek</button>
            </article>:<p className="muted">Za izbrano podjetje ni uvoženega mobilnega dogodka.</p>}
          </div>
        </section>
        <p className="footer">Offline-first zasnova · Testni osnutki se ne pošiljajo na strežnik · <Link href="/">Predogled ostalih FinAI modulov</Link> · Produkcijsko knjiženje še ni omogočeno.</p>
      </div>
    </main>
  );
}
