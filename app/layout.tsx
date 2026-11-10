import type { Metadata, Viewport } from "next";
import { Geist_Mono, Hanken_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import { Track } from "@/components/Track";
import "./globals.css";

// Palette "A6" (Nov 2026): all text in Plus Jakarta Sans, the logo in Hanken Grotesk ("budget" 700, "pro" 200,
// --font-logo in globals.css), numbers and amounts in Geist Mono. next/font serves them from our own domain.
const text = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-text",
  display: "swap",
});
// Hanken Grotesk also stays the text font of budgetpro Skole (app/skole/layout.tsx), so it keeps every weight.
const logoFace = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-logo-face",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});

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
    <html lang="da" className={`${text.variable} ${logoFace.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <Track />
      </body>
    </html>
  );
}
