import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Hanken_Grotesk } from "next/font/google";
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

// Logo font: "budget" in Hanken Grotesk 700, "pro" in Hanken Grotesk 200 (components/Logo.tsx). Only for the logo.
const logo = Hanken_Grotesk({ subsets: ["latin"], weight: ["200", "700"], variable: "--font-logo", display: "swap" });

export const metadata: Metadata = {
  title: "budgetpro – budget for dig, par og familier",
  description:
    "Saml løn, faste udgifter, lån og opsparing ét sted. Se hvad du har til rådighed, og planlæg med scenarier. 30 dage gratis og uden adgang til netbanken.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className={`${geist.variable} ${geistMono.variable} ${logo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
