export const dynamic = "force-static";

export default function manifest() {
  return {
    id: "/?finai=synthetic-preview",
    name: "FinAI Ledger – razvojna demonstracija",
    short_name: "FinAI Demo",
    description: "Namestljiv sintetični predogled FinAI; brez resničnega knjiženja ali plačil.",
    start_url: "/?module=dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#111827",
    lang: "sl",
    icons: [
      {src:"/finai-192.png",sizes:"192x192",type:"image/png",purpose:"any maskable"},
      {src:"/finai-512.png",sizes:"512x512",type:"image/png",purpose:"any maskable"}
    ]
  };
}
