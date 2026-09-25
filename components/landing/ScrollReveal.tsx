"use client";

import { useEffect } from "react";

/**
 * Fades elements marked `data-reveal` up into place as they scroll into view. Children of a
 * `data-reveal-group` are staggered. Progressive enhancement: the server renders everything visible,
 * and only elements that are still below the fold when this runs get hidden first – so nothing
 * flickers, and without JS (or with reduced motion) the page is simply static.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.querySelectorAll<HTMLElement>("[data-reveal-group]").forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        const el = child as HTMLElement;
        el.dataset.reveal ??= "";
        el.style.setProperty("--reveal-delay", `${Math.min(i, 5) * 90}ms`);
      });
    });

    const fold = window.innerHeight;
    const pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (el) => el.getBoundingClientRect().top > fold * 0.92,
    );
    pending.forEach((el) => (el.dataset.revealState = "pending"));

    const io = new IntersectionObserver(
      (items) => {
        for (const item of items) {
          if (!item.isIntersecting) continue;
          const el = item.target as HTMLElement;
          el.dataset.revealState = "shown";
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    pending.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
