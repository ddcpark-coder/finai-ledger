import type { Metadata } from "next";
export const metadata: Metadata = { title: "FinAI Ledger", description: "AI računovodstvo za Slovenijo" };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="sl"><body style={{margin:0}}>{children}</body></html>}