/**
 * The owner's traffic overview ("Trafik" on /admin): visits, pages, sources and forms per front door, counted
 * without cookies. The browser sends each page view to /api/besoeg (components/Track.tsx); the server keeps only
 * counts per day (lib/traffic-store.ts). A visitor is a keyed hash of the day, IP address and browser, made again
 * on every request and never with the IP itself stored, so a visitor can't be followed from one day to the next.
 * Pure functions: the route, the store and the dashboard all use them.
 */
import { today, addDays } from "./owner";
import type { Site } from "./site-host";

export const SITES: { id: Site; label: string }[] = [
  { id: "privat", label: "Privat" },
  { id: "erhverv", label: "Erhverv" },
  { id: "skole", label: "Skole" },
];

/** The forms that are counted, each on its front door. */
export const GOALS = [
  { id: "opret", site: "privat", label: "Oprettelser" },
  { id: "demo", site: "privat", label: "Demo åbnet" },
  { id: "henvendelse", site: "erhverv", label: "Prisforespørgsler" },
  { id: "laerer", site: "skole", label: "Lærertilmeldinger" },
] as const satisfies readonly { id: string; site: Site; label: string }[];
export type Goal = (typeof GOALS)[number]["id"];
export const isGoal = (x: unknown): x is Goal => GOALS.some((g) => g.id === x);

/** The source of a visit when nothing tells where it came from. */
export const DIRECT = "Direkte";
/** The source of a form or an account when there is no visit to tie it to (sent before the counting began, or the
 * browser asked not to be counted). */
export const UNKNOWN = "Ukendt";

// Referrer hosts we know by name, tried in order (Gemini before Google, webmail before the search engines).
const KNOWN: [RegExp, string][] = [
  [/(^|\.)gemini\.google\./, "Gemini"],
  [/(^|\.)(mail\.google|outlook\.(live|office)|mail\.yahoo)\./, "E-mail"],
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\./, "Bing"],
  [/(^|\.)duckduckgo\./, "DuckDuckGo"],
  [/(^|\.)ecosia\./, "Ecosia"],
  [/(^|\.)yahoo\./, "Yahoo"],
  [/(^|\.)(facebook|fb)\.(com|me)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "LinkedIn"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "X"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)claude\.ai$/, "Claude"],
];
const KNOWN_UTM: Record<string, string> = {
  google: "Google", bing: "Bing", facebook: "Facebook", fb: "Facebook", meta: "Facebook", instagram: "Instagram", ig: "Instagram",
  linkedin: "LinkedIn", tiktok: "TikTok", youtube: "YouTube", twitter: "X", x: "X", reddit: "Reddit", chatgpt: "ChatGPT",
  "chatgpt.com": "ChatGPT", perplexity: "Perplexity", newsletter: "Nyhedsbrev", nyhedsbrev: "Nyhedsbrev", email: "E-mail",
  mail: "E-mail", "e-mail": "E-mail",
};

/** Text we keep as a name: no separators, short. */
const label = (s: string, max = 40) => s.replace(/[|\s]+/g, " ").trim().slice(0, max);

/**
 * Where a visit came from: utm_source when the link has one, else the referring site by name ("Google", "LinkedIn"),
 * else its host. A referrer on our own domain (from one front door to another) is no source: null.
 */
export function sourceOf(ref: string, utmSource: string, ownHost: string): string | null {
  const utm = label(utmSource.toLowerCase());
  if (utm) return KNOWN_UTM[utm] ?? label(utmSource);
  if (!ref) return DIRECT;
  let host: string;
  try {
    host = new URL(ref).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return DIRECT;
  }
  if (!host) return DIRECT;
  const own = ownHost.toLowerCase().replace(/:\d+$/, "").replace(/^(?:skole|erhverv|www)\./, "");
  if (host === own || host.endsWith(`.${own}`)) return null;
  for (const [re, name] of KNOWN) if (re.test(host)) return name;
  return label(host);
}

/** The front door a page belongs to: the host's, or the /erhverv and /skole paths on hosts without subdomains. */
export function siteOfPage(hostSite: Site, path: string): Site {
  if (hostSite !== "privat") return hostSite;
  if (path === "/erhverv" || path.startsWith("/erhverv/")) return "erhverv";
  if (path === "/skole" || path.startsWith("/skole/")) return "skole";
  return "privat";
}

/** Pages that are tools, not part of the sites: they are not counted. */
const SKIP = /^\/(?:admin|aftale|api|budgetr-app|app)(?:\/|$)|^\/(?:skole\/)?klasse(?:\/|$)/;

/**
 * The page path as it is counted, or null when it isn't: no query or hash, no trailing slash, and segments that look
 * like ids or codes replaced by "…", so no code or token ever lands in the counts.
 */
export function cleanPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.length > 300) return null;
  const p = (raw.split(/[?#]/)[0] ?? "").replace(/\/+$/, "") || "/";
  if (SKIP.test(p)) return null;
  const parts = p.split("/").map((s) => {
    let x = s;
    try {
      x = decodeURIComponent(s);
    } catch {}
    return x.length > 24 || (/\d/.test(x) && x.length >= 6) || /[^\p{L}\p{N}._-]/u.test(x) ? "…" : x.toLowerCase();
  });
  return parts.join("/") || "/";
}

export const isBot = (ua: string) => !ua || /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|curl|wget|python|monitor/i.test(ua);
export const deviceOf = (ua: string) => (/Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobil" : "computer");

// ---- Day records -------------------------------------------------------------------------------------------------
// One record per day (Copenhagen time) with these counters, "|" between the parts:
//   v|<site>              visitors          pv|<site>          page views
//   s|<site>|<source>     visitors by source
//   p|<site>|<path>       page views by page
//   d|<site>|<device>     visitors by device ("mobil" / "computer")
//   c|<site>|<campaign>   visitors by utm_campaign
//   g|<site>|<goal>|<src> forms sent, by the visitor's source
//   l|<site>|<cc>|<city>  visitors by place (country code and city from the host's IP lookup, e.g. Vercel's)

export const dayOf = (now = new Date()) => today(now);
export const field = (...parts: string[]) => parts.map((p) => label(p, 120)).join("|");

export type Bucket = "dag" | "uge" | "maaned";

export interface Counts {
  visitors: number;
  pageviews: number;
  goals: Record<Goal, number>;
}

export interface SourceRow {
  source: string;
  visitors: number;
  prevVisitors: number;
  goals: Record<Goal, number>;
}

/** What accounts and henvendelser made in the period have become, per source. */
export interface ConversionRow {
  source: string;
  signups: number;
  confirmed: number;
  trial: number;
  paying: number;
  mrr: number;
  inquiries: number;
  agreements: number;
}

/** A place visitors were in: ISO country code, city ("" when unknown), and the city's rough position when known. */
export interface Place {
  country: string;
  city: string;
  lat?: number;
  lon?: number;
  visitors: number;
}

export interface TrafficReport {
  from: string;
  to: string;
  prev: { from: string; to: string };
  site: Site | "alle";
  bucket: Bucket;
  total: Counts;
  prevTotal: Counts;
  series: ({ label: string; from: string } & Counts)[];
  sites: ({ site: Site } & Counts)[];
  sources: SourceRow[];
  pages: { site: Site; path: string; views: number }[];
  campaigns: { name: string; visitors: number }[];
  devices: { mobil: number; computer: number };
  places: Place[];
  conversions: ConversionRow[];
}

/** Where a place's position is kept: "<cc>|<city>" → "lat,lon". */
export const placeKey = (country: string, city: string) => field(country, city);
export const parseCoords = (v: string | undefined) => {
  const [lat, lon] = (v ?? "").split(",").map(Number);
  return lat !== undefined && lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon) && v ? { lat, lon } : {};
};

export const MAX_DAYS = 731;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The days from..to (both included); a range turned the wrong way round is turned back, and it is at most MAX_DAYS. */
export function daysBetween(from: string, to: string): string[] {
  if (!ISO.test(from) || !ISO.test(to)) return [];
  const [a, b] = from <= to ? [from, to] : [to, from];
  const out: string[] = [];
  for (let d = a; d <= b && out.length < MAX_DAYS; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The period just before, as long as this one. */
export function previousPeriod(from: string, to: string) {
  const n = daysBetween(from, to).length;
  return { from: addDays(from, -n), to: addDays(from, -1) };
}

export const bucketFor = (days: number): Bucket => (days <= 62 ? "dag" : days <= 190 ? "uge" : "maaned");

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
/** The first day of the bucket a day falls in (a week starts on Monday). */
export function bucketStart(day: string, b: Bucket): string {
  if (b === "dag") return day;
  if (b === "maaned") return `${day.slice(0, 7)}-01`;
  const wd = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -wd);
}
function bucketLabel(start: string, b: Bucket): string {
  const [y = 0, m = 1, d = 1] = start.split("-").map(Number);
  if (b === "maaned") return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
  return `${d}. ${MONTHS[m - 1]}`;
}

const noGoals = () => Object.fromEntries(GOALS.map((g) => [g.id, 0])) as Record<Goal, number>;
const empty = (): Counts => ({ visitors: 0, pageviews: 0, goals: noGoals() });

export interface Day {
  day: string;
  fields: Record<string, string>;
}

/** Adds one day's counters for the chosen front door (or all three) into the tallies. */
function walk(fields: Record<string, string>, site: Site | "alle", on: (kind: string, s: string, a: string, b: string, n: number) => void) {
  for (const [k, v] of Object.entries(fields)) {
    const n = Number(v) || 0;
    const [kind = "", s = "", a = "", b = ""] = k.split("|");
    if (!n || (site !== "alle" && s !== site)) continue;
    on(kind, s, a, b, n);
  }
}

function countsOf(days: Day[], site: Site | "alle"): Counts {
  const c = empty();
  for (const d of days) {
    walk(d.fields, site, (kind, _s, goal, _b, n) => {
      if (kind === "v") c.visitors += n;
      else if (kind === "pv") c.pageviews += n;
      else if (kind === "g" && isGoal(goal)) c.goals[goal] += n;
    });
  }
  return c;
}

const top = <T,>(m: Map<string, T>, by: (t: T) => number, n: number) => [...m.entries()].sort((a, b) => by(b[1]) - by(a[1]) || a[0].localeCompare(b[0])).slice(0, n);

/** The report for a period from its days, the days of the period before, and the conversions per source. */
export function buildReport(
  range: { from: string; to: string },
  days: Day[],
  prevDays: Day[],
  site: Site | "alle",
  conversions: ConversionRow[] = [],
  coords: Record<string, string> = {},
): TrafficReport {
  const list = daysBetween(range.from, range.to);
  const from = list[0] ?? range.from, to = list.at(-1) ?? range.to;
  const bucket = bucketFor(list.length);
  const byDay = new Map(days.map((d) => [d.day, d]));

  const series = new Map<string, { label: string; from: string } & Counts>();
  for (const day of list) {
    const start = bucketStart(day, bucket);
    if (!series.has(start)) series.set(start, { label: bucketLabel(start, bucket), from: start, ...empty() });
    const d = byDay.get(day);
    if (!d) continue;
    const c = countsOf([d], site), s = series.get(start)!;
    s.visitors += c.visitors;
    s.pageviews += c.pageviews;
    for (const g of GOALS) s.goals[g.id] += c.goals[g.id];
  }

  const sources = new Map<string, SourceRow>();
  const src = (name: string) => sources.get(name) ?? sources.set(name, { source: name, visitors: 0, prevVisitors: 0, goals: noGoals() }).get(name)!;
  const pages = new Map<string, number>(), campaigns = new Map<string, number>();
  const devices = { mobil: 0, computer: 0 };
  const places = new Map<string, number>();
  for (const d of days) {
    walk(d.fields, site, (kind, s, a, b, n) => {
      if (kind === "s") src(a).visitors += n;
      else if (kind === "g" && isGoal(a)) src(b || UNKNOWN).goals[a] += n;
      else if (kind === "p") pages.set(`${s}|${a}`, (pages.get(`${s}|${a}`) ?? 0) + n);
      else if (kind === "c") campaigns.set(a, (campaigns.get(a) ?? 0) + n);
      else if (kind === "d" && (a === "mobil" || a === "computer")) devices[a] += n;
      else if (kind === "l") places.set(placeKey(a, b), (places.get(placeKey(a, b)) ?? 0) + n);
    });
  }
  for (const d of prevDays) walk(d.fields, site, (kind, _s, a, _b, n) => void (kind === "s" && sources.has(a) && (src(a).prevVisitors += n)));
  const goalSum = (r: SourceRow) => GOALS.reduce((t, g) => t + r.goals[g.id], 0);

  return {
    from,
    to,
    prev: previousPeriod(from, to),
    site,
    bucket,
    total: countsOf(days, site),
    prevTotal: countsOf(prevDays, site),
    series: [...series.values()],
    sites: SITES.map((s) => ({ site: s.id, ...countsOf(days, s.id) })),
    sources: [...sources.values()].sort((a, b) => b.visitors - a.visitors || goalSum(b) - goalSum(a) || a.source.localeCompare(b.source)),
    pages: top(pages, (n) => n, 15).map(([k, views]) => {
      const [s = "", path = ""] = k.split("|");
      return { site: s as Site, path, views };
    }),
    campaigns: top(campaigns, (n) => n, 10).map(([name, visitors]) => ({ name, visitors })),
    devices,
    places: [...places.entries()]
      .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
      .map(([k, visitors]) => {
        const [country = "", city = ""] = k.split("|");
        return { country, city, visitors, ...parseCoords(coords[k]) };
      }),
    conversions,
  };
}

/** Change from the period before in whole percent, or null when there was nothing to compare with. */
export const change = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null);
