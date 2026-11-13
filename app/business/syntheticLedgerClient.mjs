// Local/test-only synthetic financial scenario client. No real accounting API,
// background submission, production hosting, passwords, or real company data.
export const SYNTHETIC_LEDGER_API_BASE =
 (process.env.NEXT_PUBLIC_FINAI_SYNTHETIC_LEDGER_API_BASE ?? "").trim();
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);
const ACTIONS = new Set(["reserve", "deliver", "invoice", "reverse_invoice"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function syntheticLedgerAvailable(base = SYNTHETIC_LEDGER_API_BASE,
 origin = typeof location === "undefined" ? "" : location.origin) {
 try {
  const page = new URL(origin), api = new URL(base);
  return LOOPBACK.has(page.hostname) && LOOPBACK.has(api.hostname) &&
   page.origin === api.origin && api.pathname.replace(/\/$/, "") === "/api";
 } catch { return false; }
}
function assertLocal(base, origin) {
 if (!syntheticLedgerAvailable(base, origin))
  throw new Error("FinAI demo glavna knjiga je na voljo samo v lokalnem testnem okolju.");
}
function urlFor(base, companyId) {
 if (!Number.isSafeInteger(companyId) || companyId < 1)
  throw new Error("Neveljavno izbrano podjetje.");
 return base.replace(/\/$/, "") + "/companies/" + companyId + "/demo/ledger-scenario";
}
function csrfToken(cookie) {
 const token = String(cookie ?? "").split(";").map(s=>s.trim())
  .find(x=>x.startsWith("XSRF-TOKEN="));
 return token ? decodeURIComponent(token.slice("XSRF-TOKEN=".length)) : null;
}
function validateScenario(data, companyId) {
 if (!data || data.company_id !== companyId || data.demo_only !== true ||
  data.real_posting_enabled !== false || !Number.isInteger(data.version) ||
  data.version < 0 || data.version > 4 ||
  !["draft","reserved","delivered","invoiced","invoice_reversed"].includes(data.state) ||
  !Array.isArray(data.events) || data.events.length > 4 ||
  !data.inventory || !Number.isInteger(data.inventory.on_hand) ||
  !Number.isInteger(data.inventory.reserved) || !Number.isInteger(data.inventory.dispatched) ||
  data.inventory.on_hand < 0 || data.inventory.reserved < 0 ||
  data.inventory.on_hand + data.inventory.dispatched !== 12 ||
  !data.invoice || data.invoice.gross_cents !== 12200 ||
  data.invoice.net_cents !== 10000 || data.invoice.vat_cents !== 2200 ||
  data.invoice.currency !== "EUR")
  throw new Error("FinAI lokalni testni strežnik je vrnil neveljavno sintetično stanje.");
 return data;
}
export function createSyntheticLedgerClient({
 base = SYNTHETIC_LEDGER_API_BASE,
 origin = typeof location === "undefined" ? "" : location.origin,
 fetcher = globalThis.fetch,
 cookie = () => typeof document === "undefined" ? "" : document.cookie
} = {}) {
 assertLocal(base, origin);
 const call = async (companyId, method, actionData) => {
  assertLocal(base, origin);
  const path = urlFor(base, companyId);
  const headers = {
   "Accept":"application/json", "X-Requested-With":"XMLHttpRequest",
  };
  if (method === "POST") {
   const csrf = await fetcher(origin+"/sanctum/csrf-cookie",{
    method:"GET",credentials:"include",cache:"no-store",redirect:"error",
    headers:{"Accept":"application/json"}
   });
   if (!csrf.ok) throw Object.assign(new Error("Testna seja ni potrjena."),{status:csrf.status});
   const token = csrfToken(cookie());
   if (!token) throw new Error("Manjka CSRF zaščita testne seje.");
   headers["X-XSRF-TOKEN"] = token;
   headers["Content-Type"] = "application/json";
  }
  const response = await fetcher(path+(method==="POST"?"/events":""),{
   method, credentials:"include", cache:"no-store", redirect:"error", headers,
   ...(method==="POST"?{body:JSON.stringify(actionData)}:{})
  });
  if (!response.ok) {
   const status=response.status;
   const message=status===409?"Prehod ali različica je v konfliktu. Preveri demo stanje.":
    status===401||status===403?"Dostop do izoliranega testa ni dovoljen.":
    "Sintetični strežnik ni dosegljiv ("+status+").";
   throw Object.assign(new Error(message),{status});
  }
  const payload=(await response.json()).data;
  return validateScenario(payload,companyId);
 };
 return {
  read(companyId){return call(companyId,"GET");},
  advance(companyId,{action,eventId,expectedVersion}){
   if(!ACTIONS.has(action)||!UUID.test(eventId??"")||
     !Number.isSafeInteger(expectedVersion)||expectedVersion<0||expectedVersion>3)
    throw new Error("Neveljaven sintetični poslovni dogodek.");
   return call(companyId,"POST",{
    demo_only:true,action,event_id:eventId,expected_version:expectedVersion,
   });
  }
 };
}
