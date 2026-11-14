// Standalone, offline-readable, synthetic-only insight summary for mobile & Windows.
import {
  demoFinancialSeries,demoFinancialSummary,demoCrmPipeline,demoCrmSummary,demoBusinessUnits
} from "./demoBusinessModel.mjs";
import {demoNetworkState,networkStockTotals} from "./demoOperations.mjs";

export function compactDemoBusinessBrief(companyId,unitId="all"){
  const units=demoBusinessUnits(companyId);
  if(unitId!=="all"&&!units.some(u=>u.id===unitId))
    throw new RangeError("Poslovna enota ni v izbranem podjetju.");
  const series=demoFinancialSeries(companyId,unitId);
  const month=series.at(-1);
  const summary=demoFinancialSummary(series);
  const deals=demoCrmPipeline(companyId).filter(d=>
    unitId==="all"||d.unitId===unitId);
  const crm=demoCrmSummary(deals,companyId);
  const network=demoNetworkState(companyId);
  const warehouses=network.warehouses.filter(w=>unitId==="all"||w.unitId===unitId);
  const stock=warehouses.reduce((total,w)=>w.items.reduce((s,i)=>({
    onHand:s.onHand+i.onHand,reserved:s.reserved+i.reserved,
    available:s.available+i.onHand-i.reserved
  }),total),{onHand:0,reserved:0,available:0});
  if(stock.available<0||summary.profitCents!==summary.revenueCents-summary.costCents
    ||networkStockTotals(network,companyId).available<stock.available)
    throw new Error("Neveljavna testna analitika.");
  return {
    companyId,demoOnly:true,unitId,
    lastMonth:month.month,revenueCents:month.revenueCents,
    costCents:month.costCents,profitCents:month.profitCents,
    sixMonthMarginPercent:summary.marginPercent,
    stock,crm,
    recentMonths:series.slice(-3).map(row=>({
      month:row.month,revenueCents:row.revenueCents,profitCents:row.profitCents
    }))
  };
}
