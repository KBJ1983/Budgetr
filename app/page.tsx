import styles from "@/components/landing/landing.module.css";
import { FinalCta, Pricing, Quotes, Trust } from "@/components/landing/Closing";
import { Availability, HowItWorks, PhotoBanner, Sharing } from "@/components/landing/ContentSections";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { InPageLinks } from "@/components/landing/InPageLinks";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

/**
 * Landing page, layout from docs/design/forside-v2.html ("Forside v2"): header and hero share a dark rounded card,
 * a photo banner and Tryghed follow "Sådan virker det", and the product is shown with real screenshots (`pnpm shots`), not mock-ups.
 * Funktioner is a dark band between the light sections: a sideways tour of the features (opsparing and scenarier with
 * photos, beskeder and påmindelser included) and the full list to unfold. Title, description and lang come from app/layout.tsx.
 */
export default function HomePage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <PhotoBanner />
        <Trust />
        <Availability />
        <Features />
        <Sharing />
        <Quotes />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
      <ScrollReveal />
      <InPageLinks />
    </div>
  );
}
