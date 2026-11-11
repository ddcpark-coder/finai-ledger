import type { Metadata } from "next";
import DemoPwaSetup from "./components/DemoPwaSetup";

export const metadata: Metadata = {
 title: "FinAI Ledger",
 description: "AI računovodstvo za Slovenijo – razvojna demonstracija",
 applicationName: "FinAI Ledger",
 manifest: "/manifest.webmanifest",
 icons: {
  icon: [{url:"/finai-192.png",sizes:"192x192",type:"image/png"}],
  apple: [{url:"/finai-192.png",sizes:"192x192",type:"image/png"}]
 },
 appleWebApp: {capable:true,title:"FinAI Demo",statusBarStyle:"default"}
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="sl"><body style={{margin:0}}>
  {children}
  <DemoPwaSetup/>
 </body></html>;
}
