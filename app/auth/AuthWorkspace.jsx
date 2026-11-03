"use client";

import {useEffect,useState} from "react";
import {authApiConfigured,authRequest,fetchAuthMe} from "../lib/authGateway";

export default function AuthWorkspace(){
  const enabled=authApiConfigured();
  const [step,setStep]=useState(enabled?"checking":"not-configured");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [otp,setOtp]=useState("");
  const [recoveryMode,setRecoveryMode]=useState(false);
  const [secret,setSecret]=useState("");
  const [recoveryCodes,setRecoveryCodes]=useState([]);
  const [me,setMe]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const refresh=async()=>{
    try{
      const response=await fetchAuthMe();
      setMe(response?.data??null);
      setStep("authenticated");
    }catch(e){
      setMe(null);
      setStep(e.status===403&&/two-factor enrollment/i.test(e.message)?"enroll":"login");
      if(e.status!==401&&e.status!==403)setError("Povezava z API ni dosegljiva. Preveri nastavitve domene.");
    }
  };

  useEffect(()=>{
    if(!enabled)return;
    let cancelled=false;
    (async()=>{
      try{
        const response=await fetchAuthMe();
        if(cancelled)return;
        setMe(response?.data??null);
        setStep("authenticated");
      }catch(e){
        if(cancelled)return;
        setStep(e.status===403&&/two-factor enrollment/i.test(e.message)?"enroll":"login");
      }
    })();
    return()=>{cancelled=true;};
  },[enabled]);

  const run=async(fn)=>{
    if(busy)return;
    setBusy(true);setError("");
    try{await fn();}catch(e){
      setError(e.status===429?"Preveč poskusov. Poskusi znova pozneje.":
        e.status===422?"Podatki ali potrditvena koda niso pravilni.":
        e.status===503?"Produkcijska prijava še ni aktivirana.":
        e.message||"Dejanje ni uspelo.");
    }finally{setBusy(false);}
  };

  const login=e=>{e.preventDefault();run(async()=>{
    const reply=await authRequest("POST","/login",{email,password});
    setPassword("");
    if(reply?.two_factor){setOtp("");setStep("challenge");}
    else await refresh();
  });};

  const challenge=e=>{e.preventDefault();run(async()=>{
    await authRequest("POST","/two-factor-challenge",recoveryMode?
      {recovery_code:otp.trim()}:{code:otp.trim()});
    setOtp("");setRecoveryMode(false);
    await refresh();
  });};

  const enroll=e=>{e.preventDefault();run(async()=>{
    await authRequest("POST","/user/confirm-password",{password});
    setPassword("");
    await authRequest("POST","/user/two-factor-authentication",{});
    const response=await authRequest("GET","/user/two-factor-secret-key");
    if(typeof response?.secretKey!=="string")throw new Error("2FA ključ ni dosegljiv.");
    setSecret(response.secretKey);
    setStep("confirm");
  });};

  const confirm=e=>{e.preventDefault();run(async()=>{
    await authRequest("POST","/user/confirmed-two-factor-authentication",{code:otp.trim()});
    setOtp("");setSecret("");
    const codes=await authRequest("GET","/user/two-factor-recovery-codes");
    setRecoveryCodes(Array.isArray(codes)?codes:[]);
    setStep("recovery");
  });};

  const closeRecovery=()=>run(async()=>{
    setRecoveryCodes([]);
    await refresh();
  });

  const logout=()=>run(async()=>{
    await authRequest("POST","/logout",{});
    setMe(null);setOtp("");setPassword("");setSecret("");setRecoveryCodes([]);
    setStep("login");
  });

  return <main className="finaiAuth">
    <style>{`
      .finaiAuth{min-height:100dvh;background:radial-gradient(ellipse at top left,#27214d,#101322 62%);font:14px/1.5 system-ui,sans-serif;color:#f1f0f9;padding:clamp(16px,5vw,64px);display:grid;place-items:center}
      .finaiAuth *{box-sizing:border-box}.finaiAuth .authCard{width:min(100%,510px);border:1px solid #3c3d56;background:#1d2032;border-radius:20px;padding:clamp(20px,5vw,36px);box-shadow:0 30px 90px #0005}
      .finaiAuth .authBrand{font-weight:900;font-size:15px;color:#b7abff;letter-spacing:.02em}.finaiAuth h1{font-size:25px;line-height:1.2;margin:16px 0 7px}.finaiAuth p{margin:0 0 18px;color:#b9bdcf}
      .finaiAuth label{display:grid;gap:6px;font-size:12px;font-weight:700;margin:14px 0;color:#d7dbed}
      .finaiAuth input{width:100%;min-height:44px;border:1px solid #50536b;border-radius:10px;background:#121524;color:#fff;padding:10px 13px;font:inherit;font-size:15px}
      .finaiAuth input:focus-visible,.finaiAuth button:focus-visible{outline:2px solid #b7a4ff;outline-offset:2px}
      .finaiAuth button{border:1px solid #565971;border-radius:11px;padding:10px 14px;min-height:44px;color:#f5f5fb;background:#32354d;cursor:pointer;font-weight:700}
      .finaiAuth button:disabled{opacity:.55;cursor:wait}.finaiAuth .primary{background:#7764db;border-color:#8b79eb;color:#fff;width:100%;margin-top:10px}
      .finaiAuth .alt{background:transparent;border:0;color:#b7a4ff;padding:8px 0;min-height:36px;text-align:left}
      .finaiAuth .error{padding:11px;margin:13px 0;border-radius:10px;background:#5f263a;color:#ffe5ec;font-size:12px}
      .finaiAuth .secret,.finaiAuth pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#101321;padding:13px;border-radius:11px;border:1px solid #43455f;font-size:13px;user-select:text}
      .finaiAuth .companyLine{padding:10px;border-bottom:1px solid #41445b}.finaiAuth .supportNote{font-size:11px;color:#b1b5c6;margin-top:16px}
      .finaiAuth .codeGrid{max-height:215px;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .finaiAuth .codeGrid code{padding:10px 6px;background:#121524;border-radius:8px;text-align:center;font-size:11px;overflow-wrap:anywhere}
      @media(max-width:480px){.finaiAuth{padding:14px}.finaiAuth .codeGrid{grid-template-columns:1fr}.finaiAuth h1{font-size:23px}}
    `}</style>
    <section className="authCard" aria-label="Varna prijava v FinAI">
      <div className="authBrand">◆ FinAI Ledger</div>
      {step==="not-configured"&&<>
        <h1>Prijava še ni aktivirana</h1>
        <p>To je pripravljena prijavna stran. Pred uporabo mora biti povezan preverjen Laravel API na isti first-party domeni.</p>
        <a href="/" style={{color:"#b7a4ff"}}>Nazaj v demonstracijski FinAI</a>
      </>}
      {step==="checking"&&<><h1>Preverjanje seje</h1><p>Preverjam povezavo s prijavnim strežnikom.</p></>}
      {step==="login"&&<>
        <h1>Varna prijava</h1>
        <p>Prijava v FinAI z geslom in po potrebi drugo stopnjo preverjanja.</p>
        <form onSubmit={login}>
          <label>E-naslov<input autoComplete="username" type="email" required maxLength={255} value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Geslo<input autoComplete="current-password" type="password" required maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/></label>
          <button className="primary" disabled={busy} type="submit">{busy?"Preverjam ...":"Prijava"}</button>
        </form>
      </>}
      {step==="challenge"&&<>
        <h1>Druga stopnja preverjanja</h1>
        <p>{recoveryMode?"Vnesi neuporabljeno obnovitveno kodo.":"Vnesi šestmestno kodo iz aplikacije za preverjanje pristnosti."}</p>
        <form onSubmit={challenge}>
          <label>{recoveryMode?"Obnovitvena koda":"TOTP-koda"}<input inputMode={recoveryMode?"text":"numeric"} autoComplete="one-time-code" required maxLength={recoveryMode?100:6} value={otp} onChange={e=>setOtp(e.target.value)}/></label>
          <button className="primary" disabled={busy} type="submit">Preveri in nadaljuj</button>
        </form>
        <button className="alt" type="button" onClick={()=>{setOtp("");setRecoveryMode(v=>!v);}}>{recoveryMode?"Uporabi kodo iz aplikacije":"Uporabi obnovitveno kodo"}</button>
      </>}
      {step==="enroll"&&<>
        <h1>Vključitev obvezne 2FA</h1>
        <p>Za dostop do poslovnih podatkov s to vlogo moraš najprej potrditi dodatno zaščito. Za začetek znova potrdi geslo.</p>
        <form onSubmit={enroll}>
          <label>Potrditev gesla<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
          <button className="primary" disabled={busy} type="submit">Nadaljuj s 2FA</button>
        </form>
      </>}
      {step==="confirm"&&<>
        <h1>Poveži aplikacijo za TOTP</h1>
        <p>V aplikacijo za preverjanje pristnosti ročno vnesi spodnji ključ. Nato potrdi trenutno šestmestno kodo.</p>
        <div className="secret" aria-label="Ključ za nastavitev TOTP">{secret}</div>
        <form onSubmit={confirm}>
          <label>Potrditvena koda<input autoComplete="one-time-code" inputMode="numeric" required maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)}/></label>
          <button className="primary" disabled={busy} type="submit">Potrdi TOTP</button>
        </form>
      </>}
      {step==="recovery"&&<>
        <h1>Obnovitvene kode</h1>
        <p>Shrani kode na varno mesto, ločeno od gesla. Vsako kodo je mogoče uporabiti samo enkrat. Ne pošiljaj jih po e-pošti.</p>
        <div className="codeGrid">{recoveryCodes.map(code=><code key={code}>{code}</code>)}</div>
        <button className="primary" disabled={busy} onClick={closeRecovery}>Kode sem varno shranil</button>
      </>}
      {step==="authenticated"&&<>
        <h1>Prijava uspešna</h1>
        <p>Identiteta je potrjena na strežniku. Ta stran še ni povezana z dejanskimi poslovnimi moduli.</p>
        <div className="companyLine"><b>{me?.name}</b> · {me?.email}</div>
        {(me?.companies??[]).map(x=><div className="companyLine" key={x.id}>{x.name}</div>)}
        <button className="primary" disabled={busy} onClick={logout}>Varna odjava</button>
      </>}
      {error&&<div className="error" role="alert">{error}</div>}
      <div className="supportNote">Brez javne registracije. Gesla, potrditvene in obnovitvene kode se ne shranjujejo v brskalniku.</div>
    </section>
  </main>;
}
