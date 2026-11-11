"use client";

export default function DeliveryPrintPreview({printable,onClose}){
 if(!printable)return null;
 return <section className="finaiPrintDelivery" aria-label="Predogled dobavnice za tisk">
  <style>{`
   .finaiPrintDelivery{background:#fff;color:#17253e;border:1px solid #cbd3e2;border-radius:12px;padding:22px;margin:16px auto;max-width:850px;font:14px/1.55 Arial,sans-serif;box-sizing:border-box}
   .finaiPrintDelivery h2{font-size:22px;line-height:1.2;margin:5px 0 10px;color:#101b35}
   .finaiPrintDelivery h3{font-size:14px;margin:14px 0 5px;color:#17253e}
   .finaiPrintDelivery .finaiPrintMeta{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:10px 0;border-top:1px solid #dce1ec;border-bottom:1px solid #dce1ec}
   .finaiPrintDelivery .finaiPrintMeta strong{display:block}
   .finaiPrintDelivery .finaiPrintTable{width:100%;border-collapse:collapse;margin:12px 0}
   .finaiPrintDelivery .finaiPrintTable th,.finaiPrintDelivery .finaiPrintTable td{border-bottom:1px solid #dce1ec;padding:8px;text-align:left}
   .finaiPrintDelivery .finaiPrintTable th{background:#f1f4f9;color:#17253e}
   .finaiPrintDelivery .finaiPrintSignature{max-width:240px;max-height:120px;object-fit:contain;background:#fff;border:1px solid #e2e5eb}
   .finaiPrintDelivery .finaiPrintHashes{font-size:10px;overflow-wrap:anywhere;color:#39465c}
   .finaiPrintDelivery .finaiPrintDisclaimer{margin-top:16px;background:#fff6df;border:1px solid #f1d38b;border-radius:7px;padding:10px;font-weight:bold;font-size:11px}
   .finaiPrintDelivery .finaiPrintControls{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin:0 0 15px}
   .finaiPrintDelivery .finaiPrintControls button{padding:9px 14px;border:1px solid #9ba6bc;border-radius:8px;background:#f1f4f9;color:#142238;cursor:pointer}
   @media(max-width:600px){
    .finaiPrintDelivery{padding:13px}.finaiPrintDelivery .finaiPrintMeta{grid-template-columns:1fr}
    .finaiPrintDelivery .finaiPrintControls button{flex:1}
    .finaiPrintDelivery h2{font-size:18px}
   }
   @media print{
    @page{size:A4;margin:16mm}
    html,body{overflow:visible!important;background:#fff!important}
    body *{visibility:hidden!important}
    .finaiPrintDelivery,.finaiPrintDelivery *{visibility:visible!important}
    .finaiPrintDelivery{position:absolute!important;inset:0 auto auto 0!important;width:100%!important;max-width:none!important;border:0!important;border-radius:0!important;margin:0!important;padding:0!important;box-shadow:none!important;break-inside:avoid}
    .finaiPrintDelivery .finaiPrintControls{display:none!important}
    .finaiPrintDelivery .finaiPrintTable tr{break-inside:avoid}
   }
  `}</style>
  <div className="finaiPrintControls">
   <button type="button" onClick={()=>window.print()}>Natisni / shrani kot PDF</button>
   <button type="button" onClick={onClose}>Zapri predogled</button>
  </div>
  <h2>{printable.title}</h2>
  <p style={{margin:"3px 0 12px"}}><b>{printable.documentId}</b> · podjetje {printable.companyId} (sintetično)</p>
  <div className="finaiPrintMeta">
   <div><small>Prejemnik</small><strong>{printable.recipient}</strong></div>
   <div><small>Podpisnik prevzema</small><strong>{printable.signer}</strong></div>
   <div><small>UTC čas demonstracijskega prevzema</small><strong>{printable.signedAt}</strong></div>
   <div><small>Vrsta podpisa</small><strong>Risba na zaslonu – brez kvalificirane identifikacije</strong></div>
  </div>
  <h3>Dobavljene postavke</h3>
  <table className="finaiPrintTable">
   <thead><tr><th>Opis</th><th>Količina</th><th>Enota</th></tr></thead>
   <tbody>{printable.lines.map((line,i)=><tr key={i}><td>{line.description}</td><td>{line.quantity}</td><td>{line.unit}</td></tr>)}</tbody>
  </table>
  <h3>Podpis prejemnika (demonstracija)</h3>
  <img className="finaiPrintSignature" src={printable.signatureImage} alt="Risba demonstracijskega podpisa"/>
  <h3>Podatki o integriteti demonstracije</h3>
  <div className="finaiPrintHashes">
   <p>SHA-256 dobavnice: {printable.documentSha256}</p>
   <p>SHA-256 risbe podpisa: {printable.signatureSha256}</p>
   <p>SHA-256 dokaznega zapisa: {printable.evidenceSha256}</p>
  </div>
  <p className="finaiPrintDisclaimer">{printable.disclaimer}</p>
 </section>;
}
