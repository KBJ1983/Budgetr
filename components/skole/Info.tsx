import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from "react";
import s from "./skole.module.css";

type Via = "hover" | "focus" | "click";

/**
 * The small "i" that explains a post: opens on hover, on tap (touch screens) and on keyboard focus. Inside a choice
 * button or a label (`inline`) it is a plain span, since those can't hold a button: its click is kept from toggling the
 * choice, and the choice points to the text with aria-describedby={id}. Elsewhere it is its own button.
 * The text is placed with fixed coordinates inside the window, so it never makes the page scroll sideways.
 */
export function Info({ text, id, about, inline }: { text: string; id: string; about: string; inline?: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const via = useRef<Via | null>(null);
  const [pos, setPos] = useState<CSSProperties | null>(null);

  const show = (how: Via) => {
    const el = ref.current;
    if (!el) return;
    via.current = how;
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const width = Math.min(300, vw - 32);
    const left = Math.max(16, Math.min(r.left + r.width / 2 - width / 2, vw - 16 - width));
    // Below the "i", or above it in the lower half of the window.
    setPos(r.top > window.innerHeight / 2 ? { left, width, bottom: window.innerHeight - r.top + 8 } : { left, width, top: r.bottom + 8 });
  };
  const hide = () => {
    via.current = null;
    setPos(null);
  };

  useEffect(() => {
    if (!pos) return;
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) hide();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [pos]);

  const props = {
    className: s.infoI,
    "data-open": pos ? true : undefined,
    onPointerEnter: (e: RPointerEvent) => {
      if (e.pointerType === "mouse" && !pos) show("hover");
    },
    onPointerLeave: (e: RPointerEvent) => {
      if (e.pointerType === "mouse" && via.current === "hover") hide();
    },
    onClick: (e: RMouseEvent) => {
      // Keep the click from choosing the option (or moving focus to a label's field).
      e.preventDefault();
      e.stopPropagation();
      if (pos && via.current === "click") hide();
      else show("click");
    },
  };
  const tip = (
    <span id={id} role="tooltip" className={s.tip} style={pos ?? undefined} hidden={!pos}>
      {text}
    </span>
  );

  if (inline)
    return (
      <span
        ref={(el) => {
          ref.current = el;
        }}
        {...props}
      >
        <span aria-hidden="true">i</span>
        {tip}
      </span>
    );
  return (
    <button
      ref={(el) => {
        ref.current = el;
      }}
      type="button"
      aria-label={`Om ${about}`}
      aria-describedby={id}
      aria-expanded={!!pos}
      onFocus={(e) => {
        if (!pos && e.target.matches(":focus-visible")) show("focus");
      }}
      onBlur={() => {
        if (via.current === "focus") hide();
      }}
      {...props}
    >
      <span aria-hidden="true">i</span>
      {tip}
    </button>
  );
}
