// FinAI NEXT39 — browser-only synthetic partner operations.
// Never accepts actual VAT verification or sends information to a server.
export function demoPartnerId(companyId, sequence) {
  if (!Number.isSafeInteger(companyId) || companyId < 1 ||
      !Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Neveljavno demonstracijsko podjetje ali zaporedje.");
  }
  return `SYN-PART-${companyId}-${String(sequence).padStart(3, "0")}`;
}

export function validateDemoPartner(input) {
  const name = String(input?.name ?? "").trim();
  const email = String(input?.email ?? "").trim();
  if (name.length < 2 || name.length > 120) throw new Error("Naziv mora vsebovati od 2 do 120 znakov.");
  if (email.length > 0 && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new Error("Vnesi veljaven predstavitveni e-naslov ali pusti polje prazno.");
  }
  return {name, email};
}

export function createDemoPartner(records, companyId, input) {
  const {name, email} = validateDemoPartner(input);
  if (!Array.isArray(records) || records.some(row => row.companyId !== companyId)) {
    throw new Error("Zapisi drugih podjetij niso dovoljeni.");
  }
  let sequence = records.length + 1;
  while (records.some(row => row.tax === demoPartnerId(companyId, sequence))) sequence++;
  const partner = {
    companyId, name, tax: demoPartnerId(companyId, sequence),
    country: "SI", balance: "0,00 €", status: "Demo", risk: "Normalno",
    vat: "Brez preverjanja", terms: "15 dni", iban: "—", email
  };
  return {records: [partner, ...records], partner};
}

export function updateDemoPartner(records, companyId, tax, input) {
  const data = validateDemoPartner(input);
  if (!Array.isArray(records) || !records.some(row => row.companyId === companyId && row.tax === tax)) {
    throw new Error("Partnerja ni v izbranem demonstracijskem podjetju.");
  }
  return records.map(row => row.companyId === companyId && row.tax === tax ? {...row, ...data} : row);
}
