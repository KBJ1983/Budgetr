/**
 * Storage for the traffic overview (lib/traffic.ts):
 *
 *   stats/dag/<YYYY-MM-DD>.json      the day's counters (no personal data; kept)
 *   stats/besoeg/<YYYY-MM-DD>.json   visitor hash → the source of their first page view that day, and
 *                                    "<hash>|<site>" for each front door they saw; deleted after two days
 *   stats/live/<YYYY-MM-DDTHH-MM>.json  per minute (UTC): visitor hash → "<site>|<path>|<cc>|<city>" for the
 *                                    live map ("Lige nu"); deleted after ten minutes
 *   stats/steder.json                "<cc>|<city>" → the city's rough position ("lat,lon", one decimal)
 *
 * Country, city and position come from the host's own IP lookup (Vercel's x-vercel-ip-* headers); without them
 * (local development) the place is unknown. Only the city is kept, never the IP.
 * The hash is an HMAC (lib/session.ts' key) of the day, the IP address and the browser, so it can only be made again
 * from the same request on the same day. A form sent today or tomorrow is tied to the visit's source through it.
 */
import { listAccounts, loadOverview } from "./owner-store";
import { listInquiries } from "./erhverv-inbox";
import { openStore } from "./kv";
import { addDays, monthly } from "./owner";
import { keyedHash } from "./session";
import { siteOfHost, type Site } from "./site-host";
import {
  DIRECT,
  UNKNOWN,
  GOALS,
  buildReport,
  cleanPath,
  dayOf,
  daysBetween,
  deviceOf,
  field,
  isBot,
  previousPeriod,
  siteOfPage,
  sourceOf,
  type ConversionRow,
  type Day,
  type Goal,
  type Place,
  type TrafficReport,
  parseCoords,
  placeKey,
} from "./traffic";

const DAYS = "stats/dag";
const VISITS = "stats/besoeg";
const LIVE = "stats/live";
const PLACES = "stats/steder.json";
/** "Lige nu" is the last five minutes. */
export const LIVE_MINUTES = 5;

type Headers = { get(name: string): string | null };

/** Who is asking, as far as counting goes: IP, browser and host from the request headers (Vercel's x-forwarded-*). */
export function clientOf(h: Headers) {
  return {
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "local",
    ua: h.get("user-agent") ?? "",
    host: h.get("x-forwarded-host") ?? h.get("host") ?? "",
    /** The browser asks not to be followed (Global Privacy Control or Do Not Track). */
    optOut: h.get("sec-gpc") === "1" || h.get("dnt") === "1",
  };
}

/** Country (ISO code), city and rough position from Vercel's IP lookup, or null when the host gives none. */
export function geoOf(h: Headers): { country: string; city: string; lat?: number; lon?: number } | null {
  const country = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return null;
  let city = h.get("x-vercel-ip-city") ?? "";
  try {
    city = decodeURIComponent(city);
  } catch {}
  city = city.replace(/[|]/g, " ").trim().slice(0, 60);
  const lat = Number(h.get("x-vercel-ip-latitude")), lon = Number(h.get("x-vercel-ip-longitude"));
  const ok = h.get("x-vercel-ip-latitude") && h.get("x-vercel-ip-longitude") && Number.isFinite(lat) && Number.isFinite(lon);
  // One decimal (about 10 km): enough for a dot on a map, never an address.
  return ok ? { country, city, lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10 } : { country, city };
}

const minuteOf = (t: Date) => t.toISOString().slice(0, 16).replace(":", "-");

const visitor = async (day: string, ip: string, ua: string, dir?: string) =>
  (await keyedHash(`besoeg|${day}|${ip}|${ua}`, dir)).toString("base64url").slice(0, 22);

export interface PageView {
  path: unknown;
  ref?: unknown;
  utmSource?: unknown;
  utmCampaign?: unknown;
}

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");

/** Counts one page view; false when it isn't counted (a bot, a tool page, or the browser asked not to be). */
export async function notePageView(view: PageView, h: Headers, now = new Date(), dir?: string): Promise<boolean> {
  const c = clientOf(h);
  const path = cleanPath(view.path);
  if (!path || c.optOut || isBot(c.ua)) return false;
  const store = openStore(dir);
  const day = dayOf(now);
  const site: Site = siteOfPage(siteOfHost(c.host), path);
  const id = await visitor(day, c.ip, c.ua, dir);
  const visits = `${VISITS}/${day}.json`;

  const source = sourceOf(str(view.ref), str(view.utmSource, 80), c.host);
  // The day's first page view decides the source; a later one from another site of ours keeps it.
  const first = await store.claim(visits, id, source ?? DIRECT);
  const newHere = (await store.claim(visits, `${id}|${site}`, "1")).fresh;

  const by: Record<string, number> = { [field("pv", site)]: 1, [field("p", site, path)]: 1 };
  if (newHere) {
    by[field("v", site)] = 1;
    by[field("s", site, first.value)] = 1;
    by[field("d", site, deviceOf(c.ua))] = 1;
    const campaign = str(view.utmCampaign, 60).trim();
    if (campaign) by[field("c", site, campaign)] = 1;
  }
  const geo = geoOf(h);
  if (newHere && geo) {
    by[field("l", site, geo.country, geo.city)] = 1;
    if (geo.lat !== undefined) await store.claim(PLACES, placeKey(geo.country, geo.city), `${geo.lat},${geo.lon}`);
  }
  await store.bump(`${DAYS}/${day}.json`, by);
  const live = await store.claim(`${LIVE}/${minuteOf(now)}.json`, id.slice(0, 12), field(site, path, geo?.country ?? "", geo?.city ?? ""));
  if (live.fresh) await forgetOld(LIVE, minuteOf(new Date(now.getTime() - 10 * 60_000)), dir);
  if (first.fresh) await forgetOld(VISITS, addDays(day, -1), dir);
  return true;
}

/** Deletes the records of a folder named before `keep` (visitor hashes: today and yesterday; live: ten minutes). */
async function forgetOld(folder: string, keep: string, dir?: string) {
  const store = openStore(dir);
  for (const name of await store.list(folder)) {
    if (name.replace(/\.json$/, "") < keep) await store.del(`${folder}/${name}`);
  }
}

export interface LiveView {
  /** Different visitors in the last LIVE_MINUTES minutes. */
  visitors: number;
  sites: Record<Site, number>;
  places: Place[];
  pages: { site: Site; path: string; visitors: number }[];
  at: string;
}

/** Who is on the sites right now (the last few minutes), by place and page – never who they are. */
export async function loadLive(now = new Date(), dir?: string): Promise<LiveView> {
  const store = openStore(dir);
  const minutes = Array.from({ length: LIVE_MINUTES }, (_, i) => minuteOf(new Date(now.getTime() - i * 60_000)));
  // Oldest first, so a visitor's latest page wins.
  const records = await Promise.all([...minutes].reverse().map((m) => store.fields(`${LIVE}/${m}.json`)));
  const seen = new Map<string, string>();
  for (const r of records) for (const [id, v] of Object.entries(r)) seen.set(id, v);
  const coords = seen.size ? await store.fields(PLACES) : {};
  const sites: Record<Site, number> = { privat: 0, erhverv: 0, skole: 0 };
  const places = new Map<string, number>(), pages = new Map<string, number>();
  for (const v of seen.values()) {
    const [site = "", path = "", country = "", city = ""] = v.split("|");
    if (site === "privat" || site === "erhverv" || site === "skole") sites[site]++;
    const pk = placeKey(country, city), gk = `${site}|${path}`;
    places.set(pk, (places.get(pk) ?? 0) + 1);
    pages.set(gk, (pages.get(gk) ?? 0) + 1);
  }
  return {
    visitors: seen.size,
    sites,
    places: [...places.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([k, visitors]) => {
        const [country = "", city = ""] = k.split("|");
        return { country, city, visitors, ...parseCoords(coords[k]) };
      }),
    pages: [...pages.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([k, visitors]) => {
        const [site = "", path = ""] = k.split("|");
        return { site: site as Site, path, visitors };
      }),
    at: now.toISOString(),
  };
}

/**
 * Counts a sent form and returns the source of the visit it came from (today's or yesterday's), or UNKNOWN. The
 * caller keeps that source on what was made (the account, the henvendelse), so it can later be followed to a trial
 * or a paying customer.
 */
export async function noteGoal(goal: Goal, h: Headers, now = new Date(), dir?: string): Promise<string> {
  const c = clientOf(h);
  const site = GOALS.find((g) => g.id === goal)!.site;
  const store = openStore(dir);
  const day = dayOf(now);
  let source = UNKNOWN;
  if (!c.optOut) {
    for (const d of [day, addDays(day, -1)]) {
      const seen = (await store.fields(`${VISITS}/${d}.json`))[await visitor(d, c.ip, c.ua, dir)];
      if (seen) {
        source = seen;
        break;
      }
    }
  }
  await store.bump(`${DAYS}/${day}.json`, { [field("g", site, goal, source)]: 1 });
  return source;
}

/** noteGoal that never stops the form it counts. */
export async function tryNoteGoal(goal: Goal, h: Headers): Promise<string | undefined> {
  try {
    return await noteGoal(goal, h);
  } catch (e) {
    console.error("[budgetr] traffic goal failed", e);
    return undefined;
  }
}

async function readDays(list: string[], dir?: string): Promise<Day[]> {
  const store = openStore(dir);
  return Promise.all(list.map(async (day) => ({ day, fields: await store.fields(`${DAYS}/${day}.json`) })));
}

const inRange = (iso: string, from: string, to: string) => {
  const d = dayOf(new Date(iso));
  return d >= from && d <= to;
};

/** What accounts and henvendelser made in the period became, per source (all front doors). */
async function loadConversions(from: string, to: string, now: Date, dir?: string): Promise<ConversionRow[]> {
  const [accounts, overview, inquiries] = await Promise.all([listAccounts(dir), loadOverview(now, dir), listInquiries(dir)]);
  const status = new Map(overview.customers.map((c) => [c.id, c]));
  const rows = new Map<string, ConversionRow>();
  const row = (s: string) =>
    rows.get(s) ?? rows.set(s, { source: s, signups: 0, confirmed: 0, trial: 0, paying: 0, mrr: 0, inquiries: 0, agreements: 0 }).get(s)!;
  for (const a of accounts) {
    if (!inRange(a.createdAt, from, to)) continue;
    const r = row(a.source || UNKNOWN), c = status.get(a.id);
    r.signups++;
    if (a.verifiedAt) r.confirmed++;
    if (c?.status === "trial") r.trial++;
    if (c?.status === "paying") {
      r.paying++;
      if (c.plan) r.mrr = Math.round((r.mrr + monthly(c.plan)) * 100) / 100;
    }
  }
  for (const q of inquiries) {
    if (!inRange(q.at, from, to)) continue;
    const r = row(q.source || UNKNOWN);
    r.inquiries++;
    if (q.org) r.agreements++;
  }
  return [...rows.values()].sort((a, b) => b.paying - a.paying || b.signups + b.inquiries - (a.signups + a.inquiries) || a.source.localeCompare(b.source));
}

/** The report for from..to (Copenhagen days), for one front door or all of them. */
export async function loadReport(from: string, to: string, site: Site | "alle", now = new Date(), dir?: string): Promise<TrafficReport> {
  const list = daysBetween(from, to);
  const a = list[0] ?? to, b = list.at(-1) ?? to;
  const prev = previousPeriod(a, b);
  const [days, prevDays, conversions] = await Promise.all([
    readDays(list, dir),
    readDays(daysBetween(prev.from, prev.to), dir),
    loadConversions(a, b, now, dir),
  ]);
  return buildReport({ from: a, to: b }, days, prevDays, site, conversions, await openStore(dir).fields(PLACES));
}
