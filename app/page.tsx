import styles from "@/components/landing/landing.module.css";
import { FinalCta, Pricing, Quotes, Trust } from "@/components/landing/Closing";
import { Availability, BusinessTeaser, Explainer, HowItWorks, PhotoBanner, Sharing } from "@/components/landing/ContentSections";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { InPageLinks } from "@/components/landing/InPageLinks";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

/**
 * Landing page, layout from docs/design/forside-v2.html ("Forside v2"): it opens with the logo intro (LogoIntro, in the hero:
 * the logo glitches in on a lime panel and flies into the header); header and hero share a light rounded card (Midnat og lime)
 * that stands still,
 * followed by a short explainer film (components/Film, made from video/privat.html),
 * a photo banner and Tryghed follow "Sådan virker det", and the product is shown with real screenshots (`pnpm shots`), not mock-ups.
 * The lime call to action (FinalCta) sits after Tryghed, before Rådighed. Funktioner is a light band (the hero's paper):
 * a sideways tour of the features (opsparing and scenarier with photos, beskeder and påmindelser included) and the full
 * list to unfold. A short midnight Erhverv teaser closes the page. Title, description and lang come from app/layout.tsx.
 */
export default function HomePage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <Hero />
        <Explainer />
        <HowItWorks />
        <PhotoBanner />
        <Trust />
        <FinalCta />
        <Availability />
        <Features />
        <Sharing />
        <Quotes />
        <Pricing />
        <BusinessTeaser />
      </main>
      <SiteFooter />
      <ScrollReveal />
      <InPageLinks />
    </div>
  );
}
