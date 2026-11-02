import styles from "@/components/landing/landing.module.css";
import { FinalCta, Pricing, Quotes, Trust } from "@/components/landing/Closing";
import { Availability, BusinessTeaser, Explainer, HowItWorks, PhotoBanner, Sharing } from "@/components/landing/ContentSections";
import { AllFeatures, Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { InPageLinks } from "@/components/landing/InPageLinks";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

/**
 * Landing page after the design "budgetpro – Mynte og is komplet" (Nov 2026): it opens with the logo intro (LogoIntro,
 * in the hero: the logo glitches in and flies into the header); header and hero share one mynte-tint rounded card with
 * a drawn, dark picture of the Overblik (AppCard). Then the explainer film (components/Film, made from
 * video/privat.html), "Sådan virker det", a photo banner, the slate Tryghed band, Rådighed (a drawn light card), the
 * koral call to action (FinalCta), Funktioner (a sideways tour on white), Alle funktioner (a coloured mosaic on the
 * tint), Deler du økonomi, quotes, Pris + FAQ and a short blæk Erhverv teaser. Title, description and lang come from
 * app/layout.tsx.
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
        <Availability />
        <FinalCta />
        <Features />
        <AllFeatures />
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
