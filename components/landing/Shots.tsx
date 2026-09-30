"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./landing.module.css";
import { scrollToSlide, useSlideIndex } from "./Swipe";

/*
 * Real screenshots of the app (public/landing/, made by `pnpm shots` from the fictional budget in
 * scripts/demo-budget.mjs). Every shot exists in the light and the dark theme. The theme follows the
 * visitor's system setting until they pick one in the hero; the choice sits on <html data-shots>, so all
 * shots on the page follow it. Only the visible theme's image is loaded (the other is display:none + lazy).
 */

type Theme = "light" | "dark";

const SLIDES = [
  { id: "overblik", tab: "Overblik", alt: "Overblik: sætningen med indtægter, faste udgifter og det, der er tilbage, og bankens rådighedsbeløb", note: "Se med det samme, hvad der er tilbage hver måned, og hvad banken siger." },
  { id: "poster", tab: "Budgetposter", alt: "Budgetposter: indtægter og faste udgifter i kategorier, omregnet til pr. måned", note: "Alle faste poster ét sted, omregnet til pr. måned, uanset hvor tit de betales." },
  { id: "laan", tab: "Lån", alt: "Overblik over lån: samlet restgæld, ydelser og renter", note: "Restgæld, renter og hvornår hvert lån er betalt ud og giver luft." },
  { id: "maal", tab: "Opsparing", alt: "Opsparingsmål: månedligt beløb og hvor langt I er nået", note: "Opsparingsmål, der selv regner det månedlige beløb ud." },
] as const;

const SLIDE_MS = 4000;

function useShotTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const read = () => {
      const set = document.documentElement.dataset.shots;
      setTheme(set === "light" || set === "dark" ? set : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    };
    read();
    window.addEventListener("bp-shots", read);
    return () => window.removeEventListener("bp-shots", read);
  }, []);
  const pick = (t: Theme) => {
    document.documentElement.dataset.shots = t;
    window.dispatchEvent(new Event("bp-shots"));
  };
  return [theme, pick];
}

/** One screenshot in both themes; CSS shows the one that matches <html data-shots> (or the system theme). */
export function ThemeShot({ name, alt, width, height, sizes, className }: { name: string; alt: string; width: number; height: number; sizes: string; className?: string }) {
  return (
    <>
      <Image src={`/landing/${name}-light.jpg`} alt={alt} width={width} height={height} sizes={sizes} className={`${styles.shotLight} ${className ?? ""}`} />
      <Image src={`/landing/${name}-dark.jpg`} alt={alt} width={width} height={height} sizes={sizes} className={`${styles.shotDark} ${className ?? ""}`} />
    </>
  );
}

/** A screenshot in a rounded frame, for the content sections. */
export function ShotFrame({ name, alt, width, height }: { name: string; alt: string; width: number; height: number }) {
  return (
    <figure className={styles.shotFrame}>
      <ThemeShot name={name} alt={alt} width={width} height={height} sizes="(max-width: 760px) 100vw, 640px" />
    </figure>
  );
}

/** Hero: a short tour through the app. Tabs switch the page; it moves on by itself unless the visitor holds the pointer over it. */
export function HeroShowcase() {
  const [i, setI] = useState(0);
  const [theme, pick] = useShotTheme();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const reduce = useRef(false);
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // A little depth under the pointer; flat again when it leaves. Off with reduced motion and on touch.
  const onMove = (ev: PointerEvent<HTMLDivElement>) => {
    if (reduce.current || ev.pointerType !== "mouse" || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    setTilt({ x: ((ev.clientY - r.top) / r.height - 0.5) * -4, y: ((ev.clientX - r.left) / r.width - 0.5) * 5 });
  };

  return (
    <div className={styles.showcase} onPointerMove={onMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
      <div className={styles.showBar}>
        <div className={styles.showTabs} role="tablist" aria-label="Se appen">
          {SLIDES.map((s, k) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-controls="hero-shot"
              className={styles.showTab}
              onClick={() => setI(k)}
            >
              {s.tab}
              {k === i && (
                <span
                  className={styles.showProgress}
                  style={{ "--slide-ms": `${SLIDE_MS}ms` } as CSSProperties}
                  onAnimationEnd={() => setI((i + 1) % SLIDES.length)}
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
        <div className={styles.showTheme} role="group" aria-label="Tema på billederne">
          {(["light", "dark"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={theme === t} onClick={() => pick(t)}>
              {t === "light" ? "Lyst" : "Mørkt"}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={frame}
        className={styles.showWindow}
        style={{ "--tx": `${tilt.x}deg`, "--ty": `${tilt.y}deg` } as CSSProperties}
      >
        <div className={styles.showChrome} aria-hidden="true">
          <span />
          <span />
          <span />
          <b>app.budgetpro.dk</b>
        </div>
        <div id="hero-shot" className={styles.showStage} role="tabpanel">
          {SLIDES.map((s, k) => (
            <div key={s.id} className={styles.showSlide} data-on={k === i} aria-hidden={k !== i}>
              <ThemeShot name={s.id} alt={s.alt} width={2360} height={1474} sizes="(max-width: 1280px) 90vw, 800px" />
            </div>
          ))}
        </div>
      </div>
      <p key={i} className={styles.showNote}>
        <span className={styles.showDot} aria-hidden="true" />
        {SLIDES[i]?.note}
      </p>
    </div>
  );
}

/** The same four pages as the hero tour, shot on a phone (`mobil-<id>`; the overview is plain `mobil`). */
const PHONE_SLIDES = [
  { id: "overblik", shot: "mobil", tab: "Overblik" },
  { id: "poster", shot: "mobil-poster", tab: "Poster" },
  { id: "laan", shot: "mobil-laan", tab: "Lån" },
  { id: "maal", shot: "mobil-maal", tab: "Opsparing" },
] as const;

/**
 * Hero for small screens: the tour on a phone. Swipe the screen sideways or tap a tab; it moves on by itself
 * until the visitor touches it.
 */
export function HeroPhone() {
  const track = useRef<HTMLDivElement>(null);
  const i = useSlideIndex(track);
  const [auto, setAuto] = useState(true);
  const go = (k: number) => track.current && scrollToSlide(track.current, k);
  const slide = SLIDES.find((s) => s.id === PHONE_SLIDES[i]?.id);

  return (
    <div className={styles.phoneTour}>
      <div className={styles.phone}>
        <div
          ref={track}
          id="hero-phone"
          className={styles.phoneScreen}
          onPointerDown={() => setAuto(false)}
          onWheel={() => setAuto(false)}
        >
          {PHONE_SLIDES.map((s, k) => {
            const text = SLIDES.find((x) => x.id === s.id);
            return (
              <div key={s.id} className={styles.phoneSlide} role="group" aria-roledescription="side" aria-label={`${k + 1} af ${PHONE_SLIDES.length}`}>
                <ThemeShot name={s.shot} alt={`budgetpro på en telefon. ${text?.alt ?? ""}`} width={780} height={1560} sizes="300px" />
              </div>
            );
          })}
        </div>
      </div>
      <div className={`${styles.showTabs} ${styles.phoneTabs}`} role="group" aria-label="Se appen">
        {PHONE_SLIDES.map((s, k) => (
          <button
            key={s.id}
            type="button"
            aria-controls="hero-phone"
            aria-current={k === i}
            className={styles.showTab}
            onClick={() => {
              setAuto(false);
              go(k);
            }}
          >
            {s.tab}
            {k === i && auto && (
              <span
                className={styles.showProgress}
                style={{ "--slide-ms": `${SLIDE_MS}ms` } as CSSProperties}
                onAnimationEnd={() => go((i + 1) % PHONE_SLIDES.length)}
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>
      <p key={i} className={styles.showNote}>
        <span className={styles.showDot} aria-hidden="true" />
        {slide?.note}
      </p>
    </div>
  );
}
