"use client";

import { useSyncExternalStore } from "react";
import { siteLinks, type Site } from "@/lib/site-host";
import s from "./SiteSwitch.module.css";

const SITES: readonly { id: Site; label: string }[] = [
  { id: "privat", label: "Privat" },
  { id: "erhverv", label: "Erhverv" },
  { id: "skole", label: "Skole" },
];

const noop = () => () => {};
const browserLoc = () => `${window.location.protocol}//${window.location.host}`;

/**
 * The small "Privat · Erhverv · Skole" row above the dark top card on the three front pages. The addresses depend on
 * the host (subdomains on the real domain, paths on localhost), so the server renders the paths and the browser
 * fills in the real ones.
 */
export function SiteSwitch({ current }: { current: Site }) {
  const loc = useSyncExternalStore(noop, browserLoc, () => null);
  const links = loc ? siteLinks({ protocol: loc.slice(0, loc.indexOf("//")), host: loc.slice(loc.indexOf("//") + 2) }) : { privat: "/", erhverv: "/erhverv", skole: "/skole" };
  return (
    <nav className={s.switch} aria-label="Skift mellem privat, erhverv og skole">
      <ul className={s.list}>
        {SITES.map((site) => (
          <li key={site.id}>
            <a href={links[site.id]} className={`${s.link} ${site.id === current ? s.current : ""}`} aria-current={site.id === current ? "page" : undefined}>
              {site.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
