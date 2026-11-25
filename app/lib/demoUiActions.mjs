// Browser-only UI utilities for the synthetic FinAI workspace.
// Do not transmit or persist financial data.
export function findDemoModules(modules, search) {
  const query=String(search??"").trim().toLocaleLowerCase("sl");
  if (!Array.isArray(modules)) return [];
  return modules.filter(item=>Array.isArray(item) && typeof item[0]==="string"
    && (!query || item[0].toLocaleLowerCase("sl").includes(query)));
}

export function filterDemoRows(rows, query="", status="Vsi") {
  const q=String(query??"").trim().toLocaleLowerCase("sl");
  return (Array.isArray(rows)?rows:[]).filter(row=>
    Array.isArray(row) &&
    (!q || row.join(" ").toLocaleLowerCase("sl").includes(q)) &&
    (status==="Vsi" || row[4]===status));
}

const protectSpreadsheetFormula=value=>{
  const s=String(value??"");
  // Prevent spreadsheet formula execution for exported synthetic/user-entered cells.
  return /^[\s\uFEFF]*[=+\-@]/u.test(s) ? "'"+s : s;
};
export function demoRowsToCsv(headers, rows) {
  const csvCell=value=>'"'+protectSpreadsheetFormula(value).replaceAll('"','""')+'"';
  return "\uFEFF"+[headers,...rows].map(row=>row.map(csvCell).join(";")).join("\r\n")+"\r\n";
}
