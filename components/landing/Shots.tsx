import Image from "next/image";
import { media } from "@/lib/media-version";
import styles from "./landing.module.css";

/*
 * Real screenshots of the app (public/landing/, made by `pnpm shots` from the fictional budget in
 * scripts/demo-budget.mjs), used in the feature tour. Every shot exists in the light and the dark theme; the visitor's
 * system theme decides which one shows (or <html data-shots>, if set). Only the visible one is loaded.
 */

/** One screenshot in both themes; CSS shows the one that matches <html data-shots> (or the system theme). */
export function ThemeShot({ name, alt, width, height, sizes, className }: { name: string; alt: string; width: number; height: number; sizes: string; className?: string }) {
  return (
    <>
      <Image src={media(`/landing/${name}-light.jpg`)} alt={alt} width={width} height={height} sizes={sizes} className={`${styles.shotLight} ${className ?? ""}`} />
      <Image src={media(`/landing/${name}-dark.jpg`)} alt={alt} width={width} height={height} sizes={sizes} className={`${styles.shotDark} ${className ?? ""}`} />
    </>
  );
}
