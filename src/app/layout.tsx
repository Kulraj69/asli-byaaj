import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_Devanagari, VT323 } from "next/font/google";
import "./globals.css";
const mono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-mono", display: "swap" });
const terminal = VT323({ weight: "400", subsets: ["latin"], variable: "--font-terminal", display: "swap" });
const hindi = Noto_Sans_Devanagari({ weight: ["400", "500", "600"], subsets: ["devanagari"], variable: "--font-hindi", display: "swap" });
export const metadata: Metadata = {
  title: "Asli Byaaj 5150 — The real cost of your loan",
  description: "Paste a loan offer. See the money you receive, the total you repay and the real annual rate. A bilingual loan-cost terminal for India.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${mono.variable} ${terminal.variable} ${hindi.variable}`}>{children}</body></html>;
}
