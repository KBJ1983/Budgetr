"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./landing.module.css";
import { ThemeShot } from "./Shots";
import { nearestSlide, scrollToSlide } from "./Swipe";
import { ArrowRightIcon } from "./icons";

export type TourVisual =
  | { kind: "photo"; src: string; alt: string; position: string }
  | { kind: "shot"; name: string; alt: string; width: number; height: number }
  | { kind: "icon"; icon: ReactNode };

export type TourSlide = { label: string; title: string; body: string; visual: TourVisual };

function Visual({ v }: { v: TourVisual }) {
  if (v.kind === "photo")
    return <Image src={v.src} alt={v.alt} fill sizes="(max-width: 767px) 85vw, 380px" className={styles.photoCover} style={{ objectPosition: v.position }} />;
  if (v.kind === "shot")
    return <ThemeShot name={v.name} alt={v.alt} width={v.width} height={v.height} sizes="(max-width: 767px) 85vw, 380px" className={styles.tourShot} />;
  return (
    <span className={styles.tourIcon} aria-hidden="true">
      {v.icon}
    </span>
  );
}

/** A row of feature cards that scrolls sideways: swipe on touch, the arrows on desktop. */
export function FeatureTour({ slides }: { slides: readonly TourSlide[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  // The card the arrows are heading for, so quick clicks add up instead of stopping between two cards.
  const goal = useRef<number | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const read = () => setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft > el.scrollWidth - el.clientWidth - 4 });
    const settle = () => {
      goal.current = null;
    };
    read();
    el.addEventListener("scroll", read, { passive: true });
    el.addEventListener("scrollend", settle);
    window.addEventListener("resize", read);
    return () => {
      el.removeEventListener("scroll", read);
      el.removeEventListener("scrollend", settle);
      window.removeEventListener("resize", read);
    };
  }, []);

  // One card further (or back), lined up with the start of the row.
  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const inView = card ? Math.max(1, Math.round(el.clientWidth / card.offsetWidth)) : 1;
    const last = Math.max(0, el.children.length - inView);
    const from = Math.min(goal.current ?? nearestSlide(el), last);
    const k = Math.min(Math.max(from + dir, 0), last);
    goal.current = k;
    scrollToSlide(el, k);
  };

  return (
    <div className={styles.tour}>
      <div className={styles.tourArrows}>
        <button type="button" className={styles.tourArrow} onClick={() => step(-1)} disabled={edge.start} aria-label="Forrige funktioner">
          <span className={styles.tourArrowBack}>
            <ArrowRightIcon size={18} />
          </span>
        </button>
        <button type="button" className={styles.tourArrow} onClick={() => step(1)} disabled={edge.end} aria-label="Næste funktioner">
          <ArrowRightIcon size={18} />
        </button>
      </div>
      <ul ref={track} className={styles.tourTrack} aria-label="Funktioner" tabIndex={0}>
        {slides.map((s) => (
          <li key={s.title} className={styles.tourCard}>
            <div className={`${styles.tourVisual} ${s.visual.kind === "icon" ? styles.tourVisualIcon : ""}`}>
              <Visual v={s.visual} />
            </div>
            <div className={styles.tourText}>
              <span className={`${styles.eyebrow} ${styles.eyebrowDark} ${styles.tourLabel}`}>{s.label}</span>
              <h3 className={styles.trustBandCardTitle}>{s.title}</h3>
              <p className={styles.trustBandCardBody}>{s.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
