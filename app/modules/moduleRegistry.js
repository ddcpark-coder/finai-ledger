export const modules = [
  { key:"dashboard", label:"Nadzorna plošča", icon:"⌂", group:"core", defaultEnabled:true, route:"/" },
  { key:"incoming_invoices", label:"Prejeti računi", icon:"▤", group:"finance", defaultEnabled:true },
  { key:"issued_invoices", label:"Izdani računi", icon:"▧", group:"sales", defaultEnabled:true },
  { key:"accounting", label:"Knjiženje", icon:"⇄", group:"finance", defaultEnabled:true },
  { key:"banking", label:"Banka", icon:"◇", group:"finance", defaultEnabled:true },
  { key:"vat", label:"DDV in poročila", icon:"%", group:"finance", defaultEnabled:true },
  { key:"edavki", label:"eDavki / FURS", icon:"↗", group:"finance", defaultEnabled:true },
  { key:"partners", label:"Partnerji", icon:"◎", group:"core", defaultEnabled:true },
  { key:"documents", label:"Dokumenti", icon:"▣", group:"core", defaultEnabled:true },
  { key:"catalog", label:"Artikli in ceniki", icon:"◫", group:"sales", defaultEnabled:true },
  { key:"crm", label:"CRM", icon:"◉", group:"sales", defaultEnabled:true },
  { key:"quotes", label:"Ponudbe", icon:"◆", group:"sales", defaultEnabled:true },
  { key:"settings", label:"Nastavitve", icon:"⚙", group:"system", defaultEnabled:true },
];

export const moduleByLabel = Object.fromEntries(modules.map(module => [module.label, module]));
export const defaultNavigation = modules.filter(module => module.defaultEnabled).map(module => [module.label, module.icon]);

export function enabledModules(overrides = {}) {
  return modules.filter(module => overrides[module.key] ?? module.defaultEnabled);
}
