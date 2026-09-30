import styles from "@/components/landing/landing.module.css";
import { FinalCta, Pricing, Quotes, Trust } from "@/components/landing/Closing";
import { Availability, HowItWorks, Notifications, PhotoBanner, Sharing } from "@/components/landing/ContentSections";
import { Features, Plans } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { InPageLinks } from "@/components/landing/InPageLinks";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

/**
 * Landing page, layout from docs/design/forside-v2.html ("Forside v2"): header and hero share a dark rounded card,
 * a photo banner and Tryghed follow "Sådan virker det", and the product is shown with real screenshots (`pnpm shots`), not mock-ups.
 * "Alt det andet" is a dark band between the light sections, and opsparing/scenarier are photo cards with the text
 * below the photo. Beskeder og påmindelser is our own addition to the design. Title, description and lang come from app/layout.tsx.
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
        <Notifications />
        <Quotes />
        <Plans />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
      <ScrollReveal />
      <InPageLinks />
    </div>
  );
}
