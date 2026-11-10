"use client";
import {useState} from "react";
import {makeDraft} from "./demoInvoice.mjs";

const EMPTY={partner:"",description:"",net:"",vatRate:"22",dueDays:"15"};

export default function DemoInvoiceCreator({records,onCreate,onCancel}){
  const [form,setForm]=useState(EMPTY);
  const [error,setError]=useState("");
  const update=(key,value)=>{
    setForm(old=>({...old,[key]:value}));
    setError("");
  };
  const submit=event=>{
    event.preventDefault();
    try {
      const draft=makeDraft(form,records);
      onCreate(draft);
    } catch(exc){
      setError(exc instanceof Error?exc.message:"Osnutka ni bilo mogoče ustvariti.");
    }
  };
  return <div className="demoInvoiceOverlay" onMouseDown={e=>{if(e.target===e.currentTarget)onCancel()}}>
    <section className="demoInvoiceDialog" role="dialog" aria-modal="true" aria-label="Nov demonstracijski račun">
      <style>{"\n.demoInvoiceOverlay{position:fixed;inset:0;z-index:10000;background:#081126b9;display:grid;place-items:center;padding:14px}\n.demoInvoiceDialog{max-height:calc(100vh - 28px);overflow:auto;width:min(560px,100%);background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 25px 80px #0004;color:var(--text)}\n.demoInvoiceDialog h2{margin:0 0 5px;font-size:17px}.demoInvoiceDialog p{margin:0 0 15px;color:var(--muted);font-size:11px;line-height:1.5}\n.demoInvoiceForm{display:grid;gap:11px}.demoInvoiceForm label{display:grid;gap:5px;color:var(--text);font-size:11px;font-weight:600}\n.demoInvoiceForm input,.demoInvoiceForm select{display:block;width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);border-radius:9px;padding:10px;font-size:12px}\n.demoInvoiceForm input:focus-visible,.demoInvoiceForm select:focus-visible{outline:2px solid var(--accent);outline-offset:1px}\n.demoInvoiceForm .demoFormGrid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px}.demoInvoiceForm .demoActions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}\n.demoInvoiceForm .demoError{background:color-mix(in srgb,var(--danger) 9%,var(--panel));padding:10px;border:1px solid var(--danger);border-radius:8px;color:var(--danger);font-size:11px}\n@media(max-width:620px){.demoInvoiceForm .demoFormGrid{grid-template-columns:1fr}}\n"}</style>
      <h2>Nov demonstracijski račun</h2>
      <p>Preizkusi ustvarjanje osnutka, izračun in izdajanje. Podatki ostanejo samo v trenutnem prikazu; ne knjižijo se in ne pošiljajo.</p>
      <form className="demoInvoiceForm" onSubmit={submit}>
        <label>Kupec / partner
          <input autoFocus required maxLength={120} value={form.partner} onChange={e=>update("partner",e.target.value)} placeholder="Primer: Testni kupec d.o.o."/>
        </label>
        <label>Opis postavke
          <input required maxLength={180} value={form.description} onChange={e=>update("description",e.target.value)} placeholder="Primer: Oblikovalske storitve"/>
        </label>
        <div className="demoFormGrid">
          <label>Neto znesek (€)
            <input required inputMode="decimal" value={form.net} onChange={e=>update("net",e.target.value)} placeholder="1000,00"/>
          </label>
          <label>DDV (demo)
            <select value={form.vatRate} onChange={e=>update("vatRate",e.target.value)}>
              <option value="22">22 %</option>
              <option value="9.5">9,5 %</option>
              <option value="0">0 %</option>
            </select>
          </label>
          <label>Rok plačila
            <select value={form.dueDays} onChange={e=>update("dueDays",e.target.value)}>
              <option value="8">8 dni</option>
              <option value="15">15 dni</option>
              <option value="30">30 dni</option>
            </select>
          </label>
        </div>
        {error&&<div className="demoError" role="alert">{error}</div>}
        <div className="demoActions">
          <button type="button" className="secondary" onClick={onCancel}>Prekliči</button>
          <button type="submit" className="primary">Ustvari osnutek</button>
        </div>
      </form>
    </section>
  </div>;
}
