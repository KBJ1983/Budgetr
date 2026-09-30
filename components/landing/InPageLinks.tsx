"use client";

import { useEffect } from "react";

/**
 * Keeps `#section` out of the address bar: in-page links (`href="#…"`) scroll to their target
 * without touching the URL, and a hash in an old shared link is dropped once the browser has
 * scrolled to it. The hrefs stay real anchors, so without JS the links still work.
 */
export function InPageLinks() {
  useEffect(() => {
    if (window.location.hash) {
      const { pathname, search } = window.location;
      window.history.replaceState(window.history.state, "", pathname + search);
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const id = decodeURIComponent(link.getAttribute("href")!.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      // No behavior given: html's `scroll-behavior: smooth` applies (and the browser's reduced-motion setting).
      target.scrollIntoView();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
