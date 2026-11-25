// FINAI NEXT40: strictly browser-memory purchase-order demonstration.
// Never receives live purchase orders, updates real inventory, or posts accounting records.
export function demoPurchaseId(companyId, sequence) {
  if (!Number.isSafeInteger(companyId) || companyId<1 ||
      !Number.isSafeInteger(sequence) || sequence<1) throw new Error("Neveljavno demo zaporedje.");
  return `SYN-PO-${companyId}-${String(sequence).padStart(3,"0")}`;
}
export function createDemoPurchaseOrder(rows, companyId, input) {
  const supplier=String(input?.supplier??"").trim();
  const gross=Number(input?.gross);
  if (supplier.length<2 || supplier.length>120) throw new Error("Vnesi naziv demo dobavitelja.");
  if (!Number.isFinite(gross) || gross<=0 || gross>10000000) throw new Error("Vnesi veljaven znesek naročila.");
  if (!Array.isArray(rows)||rows.some(row=>row.companyId!==companyId)) {
    throw new Error("Podatki drugih podjetij niso dovoljeni.");
  }
  let i=rows.length+1;
  while (rows.some(row=>row.id===demoPurchaseId(companyId,i)))i++;
  const order={
    companyId,id:demoPurchaseId(companyId,i),supplier,
    status:"Naročeno",gross:Math.round(gross*100)/100,
    delivery:"Demo",match:"Čaka prevzem",sales:"—",receiptCount:0
  };
  return {order,rows:[order,...rows]};
}
export function receiveDemoPurchaseOrder(rows,companyId,orderId) {
  if (!Array.isArray(rows)||rows.some(row=>row.companyId!==companyId))
    throw new Error("Podatki drugih podjetij niso dovoljeni.");
  const order=rows.find(row=>row.id===orderId && row.companyId===companyId);
  if (!order)throw new Error("Naročilnica ne pripada izbranemu podjetju.");
  if (!["Naročeno","Delno prevzeto"].includes(order.status))
    throw new Error("Prevzem te demo naročilnice ni več mogoč.");
  return rows.map(row=>row.id===orderId?{
    ...row,status:"Prejeto",match:"Čaka račun",receiptCount:(row.receiptCount??0)+1
  }:row);
}
export function demoPurchaseMatch(order) {
  if (!order) throw new Error("Izberi naročilnico.");
  if (order.match==="Ujemanje OK")return "Sintetični primer je označen kot skladen. Dejanski račun ni bil preverjen.";
  if (order.status==="Naročeno")return "Čaka prevzem materiala. 3-way match še ni mogoč.";
  if (order.match==="Čaka račun")return "Prevzem je demo evidentiran, račun dobavitelja še ni povezan.";
  return "Sintetično odstopanje: "+order.match+". Brez sprememb v knjigovodstvu.";
}
