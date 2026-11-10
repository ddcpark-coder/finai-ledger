"use client";
import {useEffect,useState} from "react";
import {validateLocalPreviewFile} from "./localFilePreview.mjs";
import {makeIncomingDemo} from "./demoIncoming.mjs";

const INITIAL={partner:"",number:"",gross:"",vatRate:"22",dueDays:"15"};

export default function DemoIncomingCreator({records,companyId,onCreate,onCancel}){
  const [form,setForm]=useState(INITIAL);
  const [error,setError]=useState("");
  const [sampleFile,setSampleFile]=useState(null);
  const [sampleMeta,setSampleMeta]=useState(null);
  const [previewUrl,setPreviewUrl]=useState(null);
  useEffect(()=>{
    if(!sampleFile||!sampleMeta?.image){setPreviewUrl(null);return}
    const url=URL.createObjectURL(sampleFile);
    setPreviewUrl(url);
    return ()=>URL.revokeObjectURL(url);
  },[sampleFile,sampleMeta]);
  const chooseFile=event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    try{
      const metadata=validateLocalPreviewFile(file);
      setSampleMeta(metadata);setSampleFile(file);setError("");
    }catch(error){
      setSampleFile(null);setSampleMeta(null);
      setError(error instanceof Error?error.message:"Vzorčne datoteke ni mogoče prikazati.");
    }
  };
  const clearFile=()=>{setSampleFile(null);setSampleMeta(null);setPreviewUrl(null);};
  const update=(field,value)=>{
    setForm(old=>({...old,[field]:value}));
    setError("");
  };
  const submit=event=>{
    event.preventDefault();
    try{onCreate(makeIncomingDemo(form,records,new Date(),companyId));}
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
        .incomingDemoSample{padding:10px;border:1px dashed var(--line);border-radius:11px;background:var(--bg2)}
        .incomingDemoSample p{margin:5px 0 10px;font-size:10px;line-height:1.5}
        .incomingDemoSample img{display:block;width:100%;height:auto;max-height:170px;object-fit:contain;border-radius:8px;margin-top:8px}
        .incomingDemoSample .twocol label{font-size:10px;cursor:pointer}
        @media(max-width:520px){.incomingDemoForm .twocol{grid-template-columns:1fr}}
      `}</style>
      <h2 id="incomingDemoTitle">Nov demonstracijski prejeti račun</h2>
      <p>Ročni vnos in lokalni predogled sintetičnega računa za izbrano podjetje. Datoteka se nikamor ne naloži in se ne shrani v račun. OCR, AI in knjiženje niso aktivirani.</p>
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
        <section className="incomingDemoSample" aria-label="Lokalni predogled dokumenta">
          <b style={{fontSize:11}}>Fotografija ali PDF – samo lokalni preizkus</b>
          <p>Uporabi izključno sintetični dokument. Izbrana datoteka ostane v tem oknu, ni OCR-obdelana in se ob potrditvi ne prenese v sistem.</p>
          <div className="twocol">
            <label>Izberi vzorec JPG, PNG ali PDF
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                aria-label="Izberi lokalni vzorec dokumenta" onChange={chooseFile}/>
            </label>
            <label>Fotografiraj vzorec (mobilno)
              <input type="file" capture="environment" accept="image/jpeg,image/png"
                aria-label="Fotografiraj lokalni vzorec" onChange={chooseFile}/>
            </label>
          </div>
          {sampleMeta&&<div role="status" style={{marginTop:10,fontSize:10}}>
            <strong>Lokalno izbrano:</strong> {sampleMeta.name} ({Math.ceil(sampleMeta.size/1024)} KB).
            <button type="button" className="secondary" style={{marginLeft:8}} onClick={clearFile}>Odstrani vzorec</button>
            {sampleMeta.image&&previewUrl&&<img src={previewUrl} alt="Predogled sintetičnega dokumenta samo v brskalniku"/>}
            <p>Predogled je začasen in se ne shrani med prejetimi računi.</p>
          </div>}
        </section>
        {error&&<div role="alert" className="incomingDemoError">{error}</div>}
        <div className="incomingDemoActions">
          <button type="button" className="secondary" onClick={onCancel}>Prekliči</button>
          <button type="submit" className="primary">Dodaj v demonstracijo</button>
        </div>
      </form>
    </section>
  </div>;
}
