import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Wordmark fonts: "budget" in Bricolage Grotesque 200, "pro" in Instrument Sans 600 (components/Logo.tsx).
const brand = Bricolage_Grotesque({ subsets: ["latin"], weight: ["200"], variable: "--font-brand", display: "swap" });
const brandPro = Instrument_Sans({ subsets: ["latin"], weight: ["600"], variable: "--font-brand-pro", display: "swap" });

export const metadata: Metadata = {
  title: "budgetpro – gratis budget for dig, par og familier",
  description:
    "Saml løn, faste udgifter, lån og opsparing ét sted. Se hvad du har til rådighed, og planlæg med scenarier. Gratis og uden adgang til netbanken.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className={`${geist.variable} ${geistMono.variable} ${brand.variable} ${brandPro.variable}`}>
      <body>{children}</body>
    </html>
  );
}
