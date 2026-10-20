"use client";

import { useEffect, useState } from "react";
import { DK_PATH, DK_VIEW, project } from "@/lib/dk-map";
import { SITES, type Place } from "@/lib/traffic";
import type { LiveView } from "@/lib/traffic-store";

const num = (n: number) => n.toLocaleString("da-DK");
const countryName = (() => {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["da"], { type: "region" });
  } catch {}
  return (cc: string) => (cc ? (names?.of(cc) ?? cc) : "Ukendt sted");
})();
const placeName = (p: Place) => (p.city ? p.city : p.country ? countryName(p.country) : "Ukendt sted");

/** Visitors in Denmark as dots on the map (area grows with the count), the rest in a list. */
function PlaceMap({ places, live }: { places: Place[]; live?: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  const dk = places.filter((p) => p.country === "DK");
  const dots = dk
    .map((p) => ({ p, at: p.lat !== undefined && p.lon !== undefined ? project(p.lat, p.lon) : null }))
    .filter((d): d is { p: Place; at: { x: number; y: number } } => !!d.at);
  const max = Math.max(1, ...dots.map((d) => d.p.visitors));
  const abroad = new Map<string, number>();
  for (const p of places) if (p.country !== "DK") abroad.set(p.country, (abroad.get(p.country) ?? 0) + p.visitors);
  // Names for the biggest cities, biggest first, leaving out a name that would cover another name or a bigger dot.
  const radius = (n: number) => 7 + 26 * Math.sqrt(n / max);
  const labelled = new Set<string>();
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const [i, { p, at }] of dots.entries()) {
    if (labelled.size >= 6) break;
    const r = radius(p.visitors);
    const b = { x0: at.x + r + 4, y0: at.y - 14, x1: at.x + r + 8 + `${placeName(p)} · ${p.visitors}`.length * 12, y1: at.y + 12 };
    const hitsName = boxes.some((o) => b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1);
    const hitsDot = dots.slice(0, i).some(({ p: q, at: a }) => {
      const cx = Math.max(b.x0, Math.min(a.x, b.x1)), cy = Math.max(b.y0, Math.min(a.y, b.y1));
      return Math.hypot(a.x - cx, a.y - cy) < radius(q.visitors);
    });
    if (hitsName || hitsDot) continue;
    boxes.push(b);
    labelled.add(`${p.country}|${p.city}`);
  }
  const total = places.reduce((s, p) => s + p.visitors, 0);
  const key = (p: Place) => `${p.country}|${p.city}`;

  return (
    <div className="tr-map">
      <svg viewBox={`0 0 ${DK_VIEW.w} ${DK_VIEW.h}`} role="img" aria-label={`Kort over Danmark med ${num(dk.length)} byer`}>
        <path d={DK_PATH} className="tr-land" />
        {dots
          .slice()
          .reverse()
          .map(({ p, at }) => {
            const r = radius(p.visitors);
            const on = hover === key(p);
            return (
              <g key={key(p)} onMouseEnter={() => setHover(key(p))} onMouseLeave={() => setHover(null)} className={on ? "is-on" : undefined}>
                {live ? <circle cx={at.x} cy={at.y} r={r} className="tr-pulse" /> : null}
                <circle cx={at.x} cy={at.y} r={r} className="tr-dot">
                  <title>
                    {placeName(p)}: {num(p.visitors)} besøgende
                  </title>
                </circle>
                {labelled.has(key(p)) || on ? (
                  <text x={at.x + r + 6} y={at.y + 6} className="tr-city">
                    {placeName(p)} · {num(p.visitors)}
                  </text>
                ) : null}
              </g>
            );
          })}
      </svg>
      <div className="tr-places">
        {total ? (
          <table className="bx-table">
            <tbody>
              {dk.slice(0, 12).map((p) => (
                <tr key={key(p)} className={hover === key(p) ? "is-on" : undefined} onMouseEnter={() => setHover(key(p))} onMouseLeave={() => setHover(null)}>
                  <td>{placeName(p)}</td>
                  <td className="r">{num(p.visitors)}</td>
                </tr>
              ))}
              {[...abroad.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([cc, n]) => (
                  <tr key={`x${cc}`}>
                    <td>
                      {countryName(cc)}
                      {cc ? <small className="bx-muted"> · udlandet</small> : null}
                    </td>
                    <td className="r">{num(n)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <div className="bx-empty">{live ? "Ingen på siderne lige nu." : "Ingen besøg i perioden."}</div>
        )}
        {total && places.every((p) => !p.country) ? (
          <p className="bx-muted tr-note">
            Stedet kommer fra Vercels opslag af IP-adressen. Lokalt findes det ikke, så her står alle som Ukendt sted.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** The map section of the traffic tab: who is on the sites right now (updated every 10 seconds), or the period's places. */
export function TrafficMap({ periodPlaces }: { periodPlaces: Place[] }) {
  const [mode, setMode] = useState<"nu" | "periode">("nu");
  const [live, setLive] = useState<LiveView | null>(null);

  useEffect(() => {
    if (mode !== "nu") return;
    let on = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/owner/trafik/live", { cache: "no-store" });
        if (r.ok && on) setLive((await r.json()) as LiveView);
      } catch {}
    };
    void load();
    const timer = window.setInterval(load, 10_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      on = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [mode]);

  return (
    <section className="bx-section">
      <div className="bx-section-head">
        <h2>Kort</h2>
        <span className="bx-muted">
          {mode === "nu"
            ? live
              ? `${num(live.visitors)} besøgende de sidste 5 minutter · opdateres hvert 10. sekund`
              : "Henter …"
            : "Besøgende i den valgte periode, efter by."}
        </span>
      </div>
      <div className="bx-card tr-card">
        <div className="tr-bar">
          <div className="tr-presets" role="group" aria-label="Kort">
            <button type="button" className="bx-btn" aria-pressed={mode === "nu"} onClick={() => setMode("nu")}>
              {mode === "nu" ? <i className="tr-live" aria-hidden="true" /> : null}
              Lige nu
            </button>
            <button type="button" className="bx-btn" aria-pressed={mode === "periode"} onClick={() => setMode("periode")}>
              Perioden
            </button>
          </div>
          {mode === "nu" && live ? (
            <span className="bx-muted tr-livesites">
              {SITES.map((s) => `${s.label} ${num(live.sites[s.id])}`).join(" · ")}
            </span>
          ) : null}
        </div>
        {mode === "nu" ? (
          live ? (
            <>
              <PlaceMap places={live.places} live />
              {live.pages.length ? (
                <div className="tr-livepages">
                  <span className="bx-muted">Ses lige nu:</span>
                  {live.pages.map((p) => (
                    <span key={`${p.site}${p.path}`} className="bx-tag">
                      {p.path} · {num(p.visitors)}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : null
        ) : (
          <PlaceMap places={periodPlaces} />
        )}
      </div>
    </section>
  );
}
