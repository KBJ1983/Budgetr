"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Counts page views for the owner's traffic overview (lib/traffic.ts): no cookies, nothing stored in the browser.
// Only the path, the referring site and the utm_source / utm_campaign of the link are sent – never the query
// itself, so codes in links stay out. Browsers that ask not to be followed (GPC / Do Not Track) send nothing.
let first = true;

export function Track() {
  const path = usePathname();
  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl || nav.doNotTrack === "1") return;
    const q = new URLSearchParams(location.search);
    const body = JSON.stringify({
      path: location.pathname,
      // The referrer only counts for the page the visitor landed on; after that it is our own site.
      ref: first ? document.referrer : "",
      utmSource: first ? (q.get("utm_source") ?? "") : "",
      utmCampaign: first ? (q.get("utm_campaign") ?? "") : "",
    });
    first = false;
    try {
      if (!navigator.sendBeacon?.("/api/besoeg", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/besoeg", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
      }
    } catch {}
  }, [path]);
  return null;
}
