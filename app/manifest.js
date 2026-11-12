export const dynamic = "force-static";

export default function manifest() {
  return {
    name: "FinAI Ledger",
    short_name: "FinAI",
    description: "FinAI Ledger — mobilno računovodstvo in elektronske dobavnice",
    start_url: "/field/",
    scope: "/field/",
    display: "standalone",
    background_color: "#0b1020",
    theme_color: "#0b1020",
    lang: "sl",
    orientation: "portrait-primary",
    icons:[
      {src:"/finai-pwa-192.png",sizes:"192x192",type:"image/png",purpose:"any maskable"},
      {src:"/finai-pwa-512.png",sizes:"512x512",type:"image/png",purpose:"any maskable"},
      {src:"/finai-icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}
    ],
  };
}
