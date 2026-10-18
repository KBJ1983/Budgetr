"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __bpIntroT0?: number;
  }
}

const HOLD_MS = 2500; // the glitch-in (CSS) is over by then
const SHRINK_MS = 460;
const PAUSE_MS = 90;
const FLY_MS = 640;
const BAIL_MS = 5800; // past this the CSS fallback has already hidden the panel

/**
 * Second half of LogoIntro. Once the logo has glitched in, the lime panel contracts to a rounded lime badge just around
 * the logo ("shrink"; the hero shows around it). Then badge and logo take a short run-up (a touch bigger) and whip up
 * together into the header logo's place ([data-intro-target]), shrinking to its size, with two fading copies as a trail;
 * the badge fades on the way and the logo takes the header's colours ("land"). Then the panel is gone (data-state="done")
 * and the header logo shows with a small bump. The panel clips its content, so the flying logo, the trail and the badge are
 * position: fixed and the panel's clip is dropped for the flight.
 */
export function IntroRunner() {
  useEffect(() => {
    const el = document.getElementById("bp-intro");
    if (!el || el.dataset.state !== "play") return;
    const lockup = el.querySelector<HTMLElement>("[data-intro-lockup]");
    const brand = document.querySelector<HTMLElement>("[data-intro-target]");
    const target = brand?.querySelector<HTMLElement>('[role="img"]');
    const timers: number[] = [];
    let over = false;

    const finish = (bump = false) => {
      if (over) return;
      over = true;
      timers.forEach(clearTimeout);
      off();
      el.dataset.state = "done";
      if (bump) brand?.animate([{ transform: "scale(1.12)" }, { transform: "scale(0.97)" }, { transform: "none" }], { duration: 300, easing: "ease-out" });
    };

    const shrink = () => {
      if (over || !lockup) return finish();
      el.dataset.state = "shrink";
      const P = el.getBoundingClientRect();
      const L = lockup.getBoundingClientRect();
      const T = target?.getBoundingClientRect();
      if (!T || T.width <= 0 || T.bottom <= 0 || L.width <= 0) {
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
        timers.push(window.setTimeout(() => finish(), 310));
        return;
      }
      // The badge: the logo's box with some air, kept inside the panel.
      const px = L.height * 0.55;
      const py = L.height * 0.4;
      const B = {
        left: Math.max(P.left, L.left - px),
        top: Math.max(P.top, L.top - py),
        right: Math.min(P.right, L.right + px),
        bottom: Math.min(P.bottom, L.bottom + py),
      };
      const rad = Math.round((B.bottom - B.top) * 0.32);
      const r = getComputedStyle(el).borderRadius || "24px";
      el.animate(
        [
          { clipPath: `inset(0px 0px 0px 0px round ${r})` },
          { clipPath: `inset(${B.top - P.top}px ${P.right - B.right}px ${P.bottom - B.bottom}px ${B.left - P.left}px round ${rad}px)` },
        ],
        { duration: SHRINK_MS, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" },
      );
      timers.push(window.setTimeout(() => fly(L, T, B, rad), SHRINK_MS + PAUSE_MS));
    };

    const fly = (L: DOMRect, T: DOMRect, B: { left: number; top: number; right: number; bottom: number }, rad: number) => {
      if (over || !lockup) return;
      const path: Keyframe[] = [
        { transform: "translate(0, 0) scale(1)", offset: 0, easing: "cubic-bezier(.3,0,.4,1)" },
        { transform: `translate(${-0.05 * L.width}px, ${-0.05 * L.height}px) scale(1.1)`, offset: 0.2, easing: "cubic-bezier(.7,0,.12,1)" },
        { transform: `translate(${T.left - L.left}px, ${T.top - L.top}px) scale(${T.width / L.width})`, offset: 1 },
      ];
      const fixAt = (n: HTMLElement, x: number, y: number, z: number) =>
        Object.assign(n.style, { position: "fixed", left: `${x}px`, top: `${y}px`, margin: "0", zIndex: String(z) });
      // The badge takes over from the contracted panel; its transform origin is the logo's corner, so it follows the same path.
      const badge = document.createElement("div");
      fixAt(badge, B.left, B.top, 999);
      Object.assign(badge.style, {
        width: `${B.right - B.left}px`,
        height: `${B.bottom - B.top}px`,
        borderRadius: `${rad}px`,
        background: "#d4f26b",
        transformOrigin: `${L.left - B.left}px ${L.top - B.top}px`,
      });
      el.appendChild(badge);
      el.getAnimations().forEach((a) => a.cancel());
      el.style.background = "transparent";
      el.dataset.state = "land";
      badge.animate(path, { duration: FLY_MS, fill: "forwards" });
      badge.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.45 }, { opacity: 0, offset: 0.85 }], { duration: FLY_MS, fill: "forwards" });
      // The trail: two copies a few frames behind, fainter.
      [0.22, 0.1].forEach((o, k) => {
        const c = lockup.cloneNode(true) as HTMLElement;
        c.removeAttribute("data-intro-lockup");
        fixAt(c, L.left, L.top, 1000 - k);
        c.style.opacity = String(o);
        lockup.parentElement?.appendChild(c);
        c.animate(path, { duration: FLY_MS, delay: 30 * (k + 1), fill: "forwards" });
        c.animate([{ opacity: o }, { opacity: 0 }], { duration: 160, delay: FLY_MS - 120 + 30 * (k + 1), fill: "forwards" });
      });
      fixAt(lockup, L.left, L.top, 1001);
      lockup.animate(path, { duration: FLY_MS, fill: "forwards" });
      timers.push(window.setTimeout(() => finish(true), FLY_MS + 30));
    };
    // Skipping: a quick fade while it is still glitching in; once it flies, it just finishes.
    const skip = () => {
      if (over || el.dataset.state !== "play") return;
      timers.forEach(clearTimeout);
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" });
      timers.push(window.setTimeout(finish, 230));
    };
    const events = ["pointerdown", "keydown", "wheel", "touchmove"] as const;
    const off = () => events.forEach((e) => window.removeEventListener(e, skip));
    events.forEach((e) => window.addEventListener(e, skip, { passive: true }));

    const since = performance.now() - (window.__bpIntroT0 ?? performance.now());
    if (since > BAIL_MS) finish();
    else timers.push(window.setTimeout(shrink, Math.max(0, HOLD_MS - since)));
    return () => {
      timers.forEach(clearTimeout);
      off();
    };
  }, []);
  return null;
}
