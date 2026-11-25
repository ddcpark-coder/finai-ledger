// FINAI NEXT41: in-memory only synthetic warehouse movements; no inventory backend writes.
const WAREHOUSES=["Glavno","Material","Končni izdelki"];
const round=value=>Math.round((value+Number.EPSILON)*1000)/1000;
const key=row=>[row.sku,row.wh,row.loc].join("|");
const available=row=>round(row.on-row.res);
export function refreshDemoStock(row) {
  const avail=available(row);
  return {...row,avail,status:avail<=0?"Kritično":avail<row.min?"Nizka zaloga":"OK"};
}
function assertScope(rows,companyId,locator) {
  if (!Number.isSafeInteger(companyId)||companyId<1||
      !Array.isArray(rows)||rows.some(row=>row.companyId!==companyId)) {
    throw new Error("Skladiščni zapisi drugih podjetij niso dovoljeni.");
  }
  const record=rows.find(row=>key(row)===key(locator)&&row.companyId===companyId);
  if (!record)throw new Error("Artikel ne pripada izbranemu demonstracijskemu podjetju.");
  return record;
}
function units(q) {
  const n=Number(q);
  if (!Number.isFinite(n)||n<=0||n>100000||round(n)!==n)
    throw new Error("Količina mora biti pozitivna in imeti največ tri decimalke.");
  return n;
}
export function reserveDemoStock(rows,companyId,locator,quantity) {
  const selected=assertScope(rows,companyId,locator),qty=units(quantity);
  if (qty>selected.avail)throw new Error("Rezervacija presega razpoložljivo sintetično zalogo.");
  return rows.map(row=>key(row)===key(selected)?refreshDemoStock({...row,res:round(row.res+qty)}):row);
}
export function transferDemoStock(rows,companyId,locator,targetWarehouse,quantity) {
  const selected=assertScope(rows,companyId,locator),qty=units(quantity);
  if (!WAREHOUSES.includes(targetWarehouse)||selected.wh===targetWarehouse)
    throw new Error("Izberi drugo veljavno ciljno skladišče.");
  if (qty>selected.avail)throw new Error("Prenos presega razpoložljivo sintetično zalogo.");
  const destinationKey={sku:selected.sku,wh:targetWarehouse,loc:"DEMO-"+targetWarehouse};
  const existing=rows.find(row=>key(row)===key(destinationKey));
  const next=rows.map(row=>{
    if(key(row)===key(selected))return refreshDemoStock({...row,on:round(row.on-qty)});
    if(existing&&key(row)===key(existing))return refreshDemoStock({...row,on:round(row.on+qty)});
    return row;
  });
  if(!existing)next.push(refreshDemoStock({
    ...selected,wh:targetWarehouse,loc:destinationKey.loc,on:qty,res:0,
    incoming:0,min:0
  }));
  return next;
}
export function adjustDemoStock(rows,companyId,locator,delta) {
  const selected=assertScope(rows,companyId,locator);
  const change=Number(delta);
  if (!Number.isFinite(change)||change===0||Math.abs(change)>100000||round(change)!==change)
    throw new Error("Vnesi dovoljen pozitivni ali negativni demo popravek.");
  if(round(selected.on+change)<selected.res)
    throw new Error("Popravek bi povzročil negativno razpoložljivo zalogo.");
  return rows.map(row=>key(row)===key(selected)?
    refreshDemoStock({...row,on:round(row.on+change)}):row);
}
