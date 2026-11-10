"use client";
import {useState} from "react";
import {makeIncomingDemo} from "./demoIncoming.mjs";

const INITIAL={partner:"",number:"",gross:"",vatRate:"22",dueDays:"15"};

export default function DemoIncomingCreator({records,onCreate,onCancel}){
  const [form,setForm]=useState(INITIAL);
  const [error,setError]=useState("");
  const update=(field,value)=>{
    setForm(old=>({...old,[field]:value}));
    setError("");
  };
  const submit=event=>{
    event.preventDefault();
    try{onCreate(makeIncomingDemo(form,records));}
    catch(err){setError(err instanceof Error?err.message:"Računa ni bilo mogoče dodati.");}
  };
  return <div className="incomingDemoBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onCancel()}}>
    <section role="dialog" aria-modal="true" aria-labelledby="incomingDemoTitle" className="incomingDemoDialog">
      <style>{`
        .incomingDemoBackdrop{position:fixed;inset:0;z-index:10001;display:grid;place-items:center;padding:15px;background:#081126bc}
        .incomingDemoDialog{width:min(540px,100%);max-height:90vh;overflow:auto;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--panel);color:var(--text);box-shadow:0 20px 70px #0005}
        .incomingDemoDialog h2{margin:0 0 6px;font-size:17px}.incomingDemoDialog p{font-size:11px;color:var(--muted);line-height:1.5;margin:0 0 15px}
        .incomingDemoForm{display:grid;gap:10px}.incomingDemoForm label{display:grid;gap:5px;font-size:11px;font-weight:600}
        .incomingDemoForm input,.incomingDemoForm select{width:100%;min-height:37px;border:1px solid var(--line);background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 10px;font-size:12px}
        .incomingDemoForm .twocol{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .incomingDemoError{padding:10px;border:1px solid var(--danger);border-radius:9px;color:var(--danger);font-size:11px}
        .incomingDemoActions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}
        @media(max-width:520px){.incomingDemoForm .twocol{grid-template-columns:1fr}}
      `}</style>
      <h2 id="incomingDemoTitle">Nov demonstracijski prejeti račun</h2>
      <p>Ročni vnos s sintetičnimi podatki. Brez nalaganja PDF/XML, OCR, AI, shranjevanja ali knjiženja. Podatki izginejo ob osvežitvi strani.</p>
      <form className="incomingDemoForm" onSubmit={submit}>
        <label>Dobavitelj
          <input autoFocus required maxLength={120} value={form.partner} onChange={e=>update("partner",e.target.value)} placeholder="Primer: Testni dobavitelj d.o.o."/>
        </label>
        <label>Številka prejetega računa
          <input required maxLength={60} value={form.number} onChange={e=>update("number",e.target.value)} placeholder="Primer: TEST-2026-0001"/>
        </label>
        <div className="twocol">
          <label>Bruto znesek v EUR
            <input required inputMode="decimal" value={form.gross} onChange={e=>update("gross",e.target.value)} placeholder="Primer: 1250,00"/>
          </label>
          <label>Prikazna stopnja DDV
            <select value={form.vatRate} onChange={e=>update("vatRate",e.target.value)}>
              <option value="22">22 %</option><option value="9.5">9,5 %</option><option value="0">0 %</option>
            </select>
          </label>
        </div>
        <label>Demonstracijski rok plačila
          <select value={form.dueDays} onChange={e=>update("dueDays",e.target.value)}>
            <option value="8">8 dni</option><option value="15">15 dni</option><option value="30">30 dni</option>
          </select>
        </label>
        {error&&<div role="alert" className="incomingDemoError">{error}</div>}
        <div className="incomingDemoActions">
          <button type="button" className="secondary" onClick={onCancel}>Prekliči</button>
          <button type="submit" className="primary">Dodaj v demonstracijo</button>
        </div>
      </form>
    </section>
  </div>;
}
