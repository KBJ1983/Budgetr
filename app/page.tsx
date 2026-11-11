import styles from "@/components/landing/landing.module.css";
import f from "@/components/landing/front.module.css";
import {
  FrontBento,
  FrontFeatures,
  FrontFilm,
  FrontFinal,
  FrontHero,
  FrontPricing,
  FrontSafety,
  FrontStory,
  FrontTalk,
} from "@/components/landing/Front";
import { InPageLinks } from "@/components/landing/InPageLinks";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

const NAV = [
  { href: "#saadan", label: "Sådan virker det" },
  { href: "#funktioner", label: "Funktioner" },
  { href: "#tryghed", label: "Tryghed" },
  { href: "#pris", label: "Pris" },
] as const;

/**
 * The private front page, design "A6" (Nov 2026, user's choice; prototype public/forslag/mix.html, sections in
 * components/landing/Front.tsx): a centred hero, the explainer film, a bento grid of the app with the demo family's
 * numbers and a photo, the dark "Sådan bliver tallet til" band, Funktioner (a scenario card and the groups folded),
 * the dialog "Det, I plejer at spørge hinanden om", Tryghed, price + FAQ and the closing signup with a photo.
 * Title, description and lang come from app/layout.tsx.
 */
export default function HomePage() {
  return (
    <div className={`${styles.page} ${f.page}`}>
      <SiteHeader links={NAV} />
      <main className={f.main}>
        <FrontHero />
        <FrontFilm />
        <FrontBento />
        <FrontStory />
        <FrontFeatures />
        <FrontTalk />
        <FrontSafety />
        <FrontPricing />
        <FrontFinal />
      </main>
      <SiteFooter />
      <InPageLinks />
      <ScrollReveal />
    </div>
  );
}
