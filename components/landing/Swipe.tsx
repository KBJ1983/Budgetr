"use client";

import { Children, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import styles from "./landing.module.css";

/** Index of the child whose left edge sits nearest the track's start (the last one once scrolled to the end). */
export function nearestSlide(track: HTMLElement): number {
  const items = Array.from(track.children) as HTMLElement[];
  if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 2) return Math.max(0, items.length - 1);
  const start = items[0]?.offsetLeft ?? 0;
  const dist = (item: HTMLElement) => Math.abs(item.offsetLeft - start - track.scrollLeft);
  let best = 0;
  items.forEach((item, k) => {
    if (dist(item) < dist(items[best]!)) best = k;
  });
  return best;
}

/** Scrolls the track so child `k` sits at its start. */
export function scrollToSlide(track: HTMLElement, k: number) {
  const items = Array.from(track.children) as HTMLElement[];
  const item = items[k];
  if (!item) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  track.scrollTo({ left: item.offsetLeft - (items[0]?.offsetLeft ?? 0), behavior: smooth ? "smooth" : "auto" });
}

/** Keeps the index of the slide in view up to date while the track scrolls. */
export function useSlideIndex(track: RefObject<HTMLElement | null>): number {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setActive(nearestSlide(el)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [track]);
  return active;
}

/**
 * A list of cards that turns into a swipeable strip on phones (scroll-snap, below 768px), with dots under it.
 * On wider screens the list keeps its own grid (`className`) and the dots are hidden. `data-swipe` tells
 * ScrollReveal to fade the strip in as one piece, since the cards beyond the edge are not on screen yet.
 */
export function SwipeList({
  as: Tag = "ul",
  className,
  label,
  tone = "light",
  children,
}: {
  as?: "ul" | "ol";
  className?: string;
  /** What the dots are for, read out by screen readers ("Trin", "Citater" …). */
  label: string;
  tone?: "light" | "dark";
  children: ReactNode;
}) {
  const track = useRef<HTMLElement>(null);
  const active = useSlideIndex(track);
  const count = Children.count(children);

  return (
    <div className={`${styles.swipe} ${tone === "dark" ? styles.swipeDark : ""}`}>
      <Tag ref={track as never} className={`${className ?? ""} ${styles.swipeTrack}`} data-reveal-group data-swipe>
        {children}
      </Tag>
      <div className={styles.swipeDots} role="group" aria-label={label}>
        {Array.from({ length: count }, (_, k) => (
          <button
            key={k}
            type="button"
            aria-label={`${k + 1} af ${count}`}
            aria-current={k === active}
            onClick={() => track.current && scrollToSlide(track.current, k)}
          />
        ))}
      </div>
    </div>
  );
}
