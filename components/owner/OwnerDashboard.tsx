"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import {
  CATEGORIES,
  MAX_ORG_ADMINS,
  MAX_PACK_MONTHS,
  PACK_SEND_MONTHS,
  addMonths,
  listPrice,
  type Category,
  type CustomerRow,
  type Expense,
  type Interval,
  type Line,
  type OrgCategory,
  type OrgRow,
  type Overview,
  type PackRow,
  type Plan,
  type Status,
} from "@/lib/owner";
import { inquiryChoices, sectorLabel } from "@/lib/erhverv";
import type { InquiryRow } from "@/lib/erhverv-inbox";
import { isPackCount, isPackMonths, packLabel, packPrice } from "@/lib/erhverv-packs";
import type { OwnerData } from "@/lib/owner-store";
import { TrafficPanel } from "./TrafficPanel";

const kr = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 2 })} kr`;
const num = (n: number) => n.toLocaleString("da-DK");
const date = (iso?: string) => {
  if (!iso) return "–";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};
const catLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)?.label ?? c;
const INTERVAL: Record<Interval | "once", string> = { monthly: "Månedlig", yearly: "Årlig", once: "Engang" };

const ERRORS: Record<string, string> = {
  name: "Skriv et navn.",
  category: "Vælg en kategori.",
  plan: "Tjek pris og datoer. Slutdatoen skal ligge efter startdatoen.",
  seats: "Antal licenser skal være et helt tal.",
  amount: "Skriv et beløb.",
  start: "Vælg en startdato.",
  end: "Slutdatoen skal ligge efter startdatoen.",
  admins: `Skriv kundeadmins som e-mails, én pr. linje, højst ${MAX_ORG_ADMINS}.`,
  count: "Antal pladser skal være et helt tal fra 1 til 10.000.",
  months: `Varigheden skal være et helt antal måneder fra 1 til ${MAX_PACK_MONTHS}.`,
  bought: "Vælg købsdatoen.",
  sendBy: "Sidste dag skal ligge efter købsdatoen.",
  fewer: "Pakken kan ikke blive mindre end det antal pladser, der allerede er sendt.",
  inUse: "Der er allerede sendt pladser herfra, så det kan ikke slettes.",
  inquiry: "Henvendelsen findes ikke længere.",
};

/** The agreement category a henvendelse starts as; "andet" starts as a bank and is changed in the dialog. */
const sectorCategory = (id: string): OrgCategory => (id === "maegler" || id === "skole" ? id : "bank");
/** The list price of the pack a henvendelse asked about, when it is one of ours. */
const askedPrice = (p?: { count: number; months: number }) =>
  p && isPackCount(p.count) && isPackMonths(p.months) ? packPrice(p.count, p.months) : undefined;
/** Links to the folded Henvendelser section open it before the page jumps there. */
const unfoldInquiries = () => {
  const el = document.getElementById("henvendelser");
  if (el instanceof HTMLDetailsElement) el.open = true;
};
const time = (iso: string) => `${date(iso)} kl. ${new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" })}`;

/** One henvendelse from the Erhverv form, with what the owner can do about it. */
function InquiryCard({ q, onAgree, onDone }: { q: InquiryRow; onAgree?: () => void; onDone: (done: boolean) => void }) {
  return (
    <div className="bx-card ow-inq">
      <div className="ow-inq-head">
        <b>{q.company}</b>
        <span className="bx-muted">
          {sectorLabel(q.sector)} · {time(q.at)}
        </span>
      </div>
      <dl className="ow-inq-choices">
        {inquiryChoices(q)
          .slice(1)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      <p className="ow-inq-who">
        {q.name} · <a href={`mailto:${q.email}`}>{q.email}</a>
        {q.phone ? (
          <>
            {" "}
            · <a href={`tel:${q.phone.replace(/\s/g, "")}`}>{q.phone}</a>
          </>
        ) : null}
      </p>
      {q.message ? <p className="ow-inq-msg">{q.message}</p> : null}
      <div className="ow-inq-act">
        {q.doneAt ? (
          <>
            <span className="bx-muted">
              Klaret {date(q.doneAt)}
              {q.org ? " · aftale oprettet" : ""}
            </span>
            <button type="button" className="bx-btn-link" onClick={() => onDone(false)}>
              Åbn igen
            </button>
          </>
        ) : (
          <>
            <button type="button" className="bx-btn bx-btn-primary" onClick={onAgree}>
              Opret som kunde
            </button>
            <a className="bx-btn" href={`mailto:${q.email}?subject=${encodeURIComponent("Din henvendelse til budgetpro")}`}>
              Skriv til {q.name.split(" ")[0]}
            </a>
            <button type="button" className="bx-btn" onClick={() => onDone(true)}>
              Marker som klaret
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const months = (n: number) => `${n} ${n === 1 ? "måned" : "måneder"}`;
const seatsText = (o: OrgRow) =>
  o.packs.length
    ? `${num(o.seatsBought.used)} brugt · ${num(o.seatsBought.sent)} sendt · ${num(o.seatsBought.count)} i alt`
    : o.seats === undefined
      ? "–"
      : `${num(o.seats)} licenser`;

function StatusTag({ status, trialEnds }: { status: Status; trialEnds?: string }) {
  switch (status) {
    case "paying":
      return <span className="bx-tag">Betaler</span>;
    case "trial":
      return <span className="bx-tag is-warn">Prøveperiode til {date(trialEnds)}</span>;
    case "ended":
      return <span className="bx-tag is-neg">Udløbet</span>;
    case "unconfirmed":
      return <span className="bx-tag is-muted">Ikke bekræftet</span>;
    default:
      return <span className="bx-tag is-muted">Uden abonnement</span>;
  }
}

const planText = (p?: Plan) =>
  p ? `${kr(p.price)} ${p.interval === "monthly" ? "pr. md." : "pr. år"}${p.end ? ` · slutter ${date(p.end)}` : ""}` : "–";

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: "hi" | "pos" | "neg" }) {
  return (
    <div className={`bx-tile${tone ? ` is-${tone}` : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
      <span>{sub}</span>
    </div>
  );
}

function Lines({ title, lines, empty, note, tone }: { title: string; lines: Line[]; empty: string; note?: string; tone?: "neg" | "warn" }) {
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div className={`bx-card ow-lines${tone && lines.length ? ` is-${tone}` : ""}`}>
      <div className="ow-lines-head">
        <b>{title}</b>
        {lines.length ? <span>{kr(Math.round(total * 100) / 100)}</span> : null}
      </div>
      {note ? <p className="bx-muted">{note}</p> : null}
      {lines.length ? (
        <ul>
          {lines.map((l, i) => (
            <li key={i}>
              <span>
                {l.who}
                <small>
                  {date(l.date)} · {catLabel(l.category)}
                </small>
              </span>
              <span className="ow-amt">{kr(l.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bx-muted">{empty}</p>
      )}
    </div>
  );
}

/** A native modal dialog with a form; closes on Escape and on the cross. */
function Dialog({ title, onClose, onSubmit, children, foot }: {
  title: string;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
  children: ReactNode;
  foot?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="bx-dialog" onClose={onClose} onCancel={onClose}>
      <form
        method="dialog"
        noValidate
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <div className="bx-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="bx-btn" onClick={onClose} aria-label="Luk">
            ✕
          </button>
        </div>
        <div className="bx-dialog-body">{children}</div>
        <div className="bx-dialog-foot">
          <div>{foot}</div>
          <div>
            <button type="button" className="bx-btn" onClick={onClose}>
              Annullér
            </button>
            <button type="submit" className="bx-btn bx-btn-primary">
              Gem
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="bx-field">
      <span>{label}</span>
      {children}
      {help ? <small className="bx-muted">{help}</small> : null}
    </label>
  );
}

/** Interval, price, start and end of a plan; the price follows the price list until it is typed. */
function PlanFields({ plan, logins, defaultStart, optional }: { plan?: Plan; logins: number; defaultStart: string; optional?: boolean }) {
  const [interval, setInterval] = useState<Interval>(plan?.interval ?? "monthly");
  const [price, setPrice] = useState(plan ? String(plan.price) : optional ? "" : String(listPrice("monthly", logins)));
  const [typed, setTyped] = useState(!!plan || !!optional);
  return (
    <>
      <div className="bx-grid-2">
        <Field label="Betaling">
          <select
            className="bx-select"
            name="interval"
            value={interval}
            onChange={(e) => {
              const v = e.target.value as Interval;
              setInterval(v);
              if (!typed) setPrice(String(listPrice(v, logins)));
            }}
          >
            <option value="monthly">Månedlig</option>
            <option value="yearly">Årlig</option>
          </select>
        </Field>
        <Field label={`Pris pr. ${interval === "monthly" ? "måned" : "år"} (kr)`} help={optional ? "Tom = ingen aftalt pris endnu" : `Prisliste: ${kr(listPrice(interval, logins))}`}>
          <input
            className="bx-input"
            name="price"
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setTyped(true);
            }}
          />
        </Field>
      </div>
      <div className="bx-grid-2">
        <Field label="Første betaling">
          <input className="bx-input" type="date" name="start" defaultValue={plan?.start ?? defaultStart} />
        </Field>
        <Field label="Opsagt pr. (valgfri)" help="Første dag uden adgang">
          <input className="bx-input" type="date" name="end" defaultValue={plan?.end ?? ""} />
        </Field>
      </div>
    </>
  );
}

const planFrom = (f: FormData) => ({
  interval: f.get("interval"),
  price: f.get("price"),
  start: f.get("start"),
  end: f.get("end") || undefined,
});

const packFrom = (f: FormData) => ({
  count: f.get("count"),
  months: f.get("months"),
  bought: f.get("bought"),
  sendBy: f.get("sendBy") || undefined,
  price: f.get("packPrice"),
});

/** The fields of a seat pack; a new one starts from the pack a henvendelse asked about, at its list price. */
function PackFields({
  pack,
  asked,
  category,
  today,
  focus,
}: {
  pack?: PackRow;
  asked?: { count: number; months: number };
  category: OrgCategory;
  today: string;
  focus?: boolean;
}) {
  return (
    <>
      <div className="bx-grid-2">
        <Field label="Antal pladser" help={pack?.sent ? `${num(pack.sent)} er allerede sendt` : undefined}>
          <input className="bx-input" name="count" inputMode="numeric" defaultValue={pack?.count ?? asked?.count ?? ""} autoFocus={focus} />
        </Field>
        <Field label="Måneder pr. plads" help="Tæller fra den dag, brugeren tager pladsen">
          <input className="bx-input" name="months" inputMode="numeric" defaultValue={pack?.months ?? asked?.months ?? (category === "maegler" ? 3 : 12)} />
        </Field>
      </div>
      <div className="bx-grid-2">
        <Field label="Købt">
          <input className="bx-input" type="date" name="bought" defaultValue={pack?.bought ?? today} />
        </Field>
        <Field label="Kan sendes til og med" help={`Tom = ${PACK_SEND_MONTHS} måneder efter købet`}>
          <input className="bx-input" type="date" name="sendBy" defaultValue={pack?.sendBy ?? addMonths(today, PACK_SEND_MONTHS)} />
        </Field>
      </div>
      <Field label="Pris (kr, valgfri)" help="Betales én gang, på købsdagen">
        <input className="bx-input" name="packPrice" inputMode="decimal" defaultValue={pack?.price ?? askedPrice(asked) ?? ""} />
      </Field>
    </>
  );
}

/** What the henvendelse said, at the top of the dialog that turns it into a customer. */
function InquirySummary({ q }: { q: InquiryRow }) {
  return (
    <div className="bx-card ow-inq ow-inq-summary">
      <span className="bx-muted">
        Fra prisberegneren {time(q.at)} · {q.name} · {q.email}
        {q.phone ? ` · ${q.phone}` : ""}
      </span>
      <dl className="ow-inq-choices">
        {inquiryChoices(q).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {q.message ? <p className="ow-inq-msg">{q.message}</p> : null}
    </div>
  );
}

const inquiryNote = (q: InquiryRow) => `Fra prisforespørgsel ${date(q.at)}: ${q.name}${q.phone ? `, tlf. ${q.phone}` : ""}`;

type Editing =
  | { kind: "plan"; customer: CustomerRow }
  | { kind: "org"; org?: OrgRow; from?: InquiryRow }
  | { kind: "pack"; org: OrgRow; pack?: PackRow }
  | { kind: "expense"; expense?: Expense }
  | null;

export function OwnerDashboard({ initial, dev, canLogOut }: { initial: OwnerData; dev: boolean; canLogOut?: boolean }) {
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Category | "alle">("alle");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [resetDone, setResetDone] = useState(false);
  // "Overblik" (the numbers below) or "Trafik" (components/owner/TrafficPanel.tsx); #trafik opens the second.
  const [tab, setTab] = useState<"overblik" | "trafik">("overblik");

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) setTheme("light");
    if (location.hash === "#trafik") setTab("trafik");
  }, []);
  const openTab = (t: "overblik" | "trafik") => {
    setTab(t);
    history.replaceState(null, "", t === "trafik" ? "#trafik" : location.pathname);
  };

  // New henvendelser show up without a reload: fetch again when the tab is back in view, and once a minute.
  const editingRef = useRef(false);
  editingRef.current = editing !== null;
  useEffect(() => {
    const refresh = async () => {
      if (document.hidden || editingRef.current) return;
      try {
        const r = await fetch("/api/owner", { cache: "no-store" });
        if (r.ok && !editingRef.current) setData((await r.json()) as OwnerData);
      } catch {
        // Offline for a moment; the next try catches up.
      }
    };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const send = async (change: object) => {
    setError("");
    try {
      const r = await fetch("/api/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });
      if (r.status === 400) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(ERRORS[j.error ?? ""] ?? "Ændringen kunne ikke gemmes.");
        return false;
      }
      if (!r.ok) throw new Error(String(r.status));
      const next = (await r.json()) as OwnerData;
      setData(next);
      return next;
    } catch {
      setError("Det lykkedes ikke at gemme lige nu. Prøv igen om lidt.");
      return false;
    }
  };
  const close = () => {
    setEditing(null);
    setError("");
  };
  const save = async (change: object) => {
    if (await send(change)) setEditing(null);
  };
  // A pack is edited from its agreement's dialog, so go back there with the fresh numbers.
  const savePack = async (orgId: string, change: object) => {
    const next = await send(change);
    if (next) setEditing({ kind: "org", org: next.orgs.find((o) => o.id === orgId) });
  };

  // An agreement made from a henvendelse opens right away, so the pack they asked about can be added.
  const saveOrg = async (change: { org: object; inquiry?: string; pack?: object }) => {
    const next = await send({ type: "org", ...change });
    if (!next) return;
    const made = change.inquiry ? next.inquiries.find((x) => x.id === change.inquiry)?.org : undefined;
    const org = made ? next.orgs.find((o) => o.id === made) : undefined;
    setEditing(org ? { kind: "org", org } : null);
  };
  const waiting = data.inquiries.filter((x) => !x.doneAt);
  const handled = data.inquiries.filter((x) => x.doneAt);
  const newest = waiting[0];

  const q = query.trim().toLowerCase();
  const customers = data.customers.filter(
    (c) => (filter === "alle" || c.category === filter) && (!q || `${c.name} ${c.email} ${c.org?.name ?? ""}`.toLowerCase().includes(q)),
  );
  const result = Math.round((data.next.revenue - data.next.expenses) * 100) / 100;
  const total = data.categories.reduce(
    (s, c) => ({
      customers: s.customers + c.customers,
      payingCustomers: s.payingCustomers + c.payingCustomers,
      logins: s.logins + c.logins,
      active: s.active + c.active,
      paying: s.paying + c.paying,
      mrr: s.mrr + c.mrr,
      nextMonth: s.nextMonth + c.nextMonth,
    }),
    { customers: 0, payingCustomers: 0, logins: 0, active: 0, paying: 0, mrr: 0, nextMonth: 0 },
  );
  const maxMonth = Math.max(1, ...data.months.flatMap((m) => [m.revenue, m.expenses]));
  const year = data.months.reduce((s, m) => ({ revenue: s.revenue + m.revenue, expenses: s.expenses + m.expenses }), { revenue: 0, expenses: 0 });
  const yearResult = Math.round((year.revenue - year.expenses) * 100) / 100;
  const negMonths = data.months.filter((m) => m.revenue < m.expenses).length;
  // Customers who have not opened their budget for 30 days are shown in yellow.
  const staleBefore = new Date(Date.parse(data.today) - 30 * 864e5).toISOString().slice(0, 10);
  const watch = [
    data.next.ending.length ? `${num(data.next.ending.length)} ${data.next.ending.length === 1 ? "abonnement udløber" : "abonnementer udløber"}` : "",
    data.next.trialsEnding.length
      ? `${num(data.next.trialsEnding.length)} ${data.next.trialsEnding.length === 1 ? "prøveperiode slutter" : "prøveperioder slutter"}`
      : "",
  ].filter(Boolean);

  return (
    <div className="bx ow" data-theme={theme}>
      <header className="bx-top">
        <div className="bx-wrap bx-top-row">
          <Link href="/" className="bx-brand" aria-label="budgetpro – til forsiden">
            <Logo fontSize={19} dark={theme === "dark"} bg={theme === "dark" ? "#0A1522" : "#FFFFFF"} />
          </Link>
          <div className="bx-top-right">
            <span className="bx-muted">Ejeroverblik · {date(data.today)}</span>
            <a
              href="#henvendelser"
              className="bx-btn ow-inq-link"
              onClick={() => {
                if (tab !== "overblik") setTab("overblik");
                requestAnimationFrame(unfoldInquiries);
              }}
            >
              Henvendelser
              {waiting.length ? <span className="ow-badge">{num(waiting.length)}</span> : null}
            </a>
            <button type="button" className="bx-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Lyst tema" : "Mørkt tema"}
            </button>
            {canLogOut ? (
              <button
                type="button"
                className="bx-btn"
                onClick={async () => {
                  await fetch("/api/admin/login", { method: "DELETE" }).catch(() => {});
                  window.location.reload();
                }}
              >
                Log ud
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="bx-wrap bx-main">
        {dev ? (
          <div className="bx-note is-info">
            <span>
              Udviklingstilstand: siden er åben uden login. Sæt ADMIN_PASSWORD og OWNER_EMAILS i .env.local for at prøve
              login her. I drift kræver siden altid login.
            </span>
          </div>
        ) : null}

        <div className="bx-tabbar ow-tabbar">
          <div className="bx-tabs" role="tablist">
            <button type="button" role="tab" className="bx-tab" aria-selected={tab === "overblik"} onClick={() => openTab("overblik")}>
              Overblik
            </button>
            <button type="button" role="tab" className="bx-tab" aria-selected={tab === "trafik"} onClick={() => openTab("trafik")}>
              Trafik
            </button>
          </div>
        </div>

        {tab === "trafik" ? (
          <TrafficPanel />
        ) : (
          <>
        {newest ? (
          <a href="#henvendelser" className="ow-alert" onClick={unfoldInquiries}>
            <span className="ow-badge">{num(waiting.length)}</span>
            <span className="ow-alert-text">
              <b>{waiting.length === 1 ? "Der ligger en ny kundehenvendelse" : `Der ligger ${num(waiting.length)} nye kundehenvendelser`}</b>
              <small>
                Seneste fra {newest.company}, {time(newest.at)}.
              </small>
            </span>
            <span className="ow-alert-go">Se {waiting.length === 1 ? "den" : "dem"} →</span>
          </a>
        ) : null}

        <div className="ow-hero">
          <p>
            budgetpro har <b>{num(data.users.logins)} {data.users.logins === 1 ? "bruger" : "brugere"}</b>, og{" "}
            <b>{num(data.active.d30)}</b> har brugt budgettet de seneste 30 dage. <b>{num(data.paying.logins)}</b> betaler, og den
            månedlige omsætning er <b className="pos">{kr(data.mrr)}</b>. I {data.nextMonth} venter <b>{kr(data.next.revenue)}</b> ind og{" "}
            <b>{kr(data.next.expenses)}</b> ud, så resultatet bliver <b className={result < 0 ? "neg" : "pos"}>{kr(result)}</b>.
          </p>
          {watch.length ? (
            <small className="ow-hbar">
              Hold øje med {data.nextMonth}: {watch.join(" og ")}.
            </small>
          ) : null}
        </div>

        {/* Folded by default; the banner and the top button unfold it. */}
        <details className="bx-section ow-fold" id="henvendelser">
            <summary className="bx-section-head">
              <h2>
                Henvendelser
                {waiting.length ? <span className="ow-badge">{num(waiting.length)} venter</span> : null}
              </h2>
              <span className="bx-muted">Fra formularen på Erhverv. De venter her, til du har oprettet en aftale eller markeret dem som klaret.</span>
            </summary>
            {waiting.length ? (
              <div className="ow-inqs">
                {waiting.map((x) => (
                  <InquiryCard
                    key={x.id}
                    q={x}
                    onAgree={() => setEditing({ kind: "org", from: x })}
                    onDone={(done) => void send({ type: "inquiry", id: x.id, done })}
                  />
                ))}
              </div>
            ) : (
              <div className="bx-empty">Ingen henvendelser venter. Nye fra prisformularen på Erhverv kommer her.</div>
            )}
            {handled.length ? (
              <details className="ow-fold ow-inq-done">
                <summary className="bx-section-head">
                  <h2>Klarede · {num(handled.length)}</h2>
                </summary>
                <div className="ow-inqs">
                  {handled.map((x) => (
                    <InquiryCard key={x.id} q={x} onDone={(done) => void send({ type: "inquiry", id: x.id, done })} />
                  ))}
                </div>
              </details>
            ) : null}
          </details>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Brugere</h2>
            <span className="bx-muted">Rigtige konti, uden testbrugere. Aktiv = har åbnet eller gemt budgettet.</span>
          </div>
          <div className="bx-tiles">
            <Tile
              label="Brugere"
              value={num(data.users.logins)}
              sub={`${num(data.users.budgets)} budgetter${data.users.unconfirmed ? ` · ${num(data.users.unconfirmed)} ikke bekræftet` : ""}`}
            />
            <Tile label="Aktive brugere, 30 dage" value={num(data.active.d30)} sub={`${num(data.active.d7)} de seneste 7 dage`} />
            <Tile
              label="Betalende brugere"
              value={num(data.paying.logins)}
              sub={`${num(data.paying.customers)} betalende kunder · ${num(data.paying.trial)} i prøveperiode`}
            />
            <Tile label="Månedlig omsætning (MRR)" value={kr(data.mrr)} sub="Årsabonnementer regnet om pr. måned" />
          </div>
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Næste måned · {data.nextMonth}</h2>
          </div>
          <div className="bx-tiles is-3">
            <Tile label="Forventet omsætning" value={kr(data.next.revenue)} sub={`${num(data.next.renewals.length)} betalinger`} tone="pos" />
            <Tile label="Udgifter" value={kr(data.next.expenses)} sub={`${num(data.next.expenseLines.length)} poster`} />
            <Tile label="Resultat" value={kr(result)} sub="Omsætning minus udgifter" tone={result < 0 ? "neg" : "hi"} />
          </div>
          <div className="ow-grid">
            <Lines title="Fornyes" lines={data.next.renewals} empty="Ingen betalinger næste måned." />
            <Lines
              title="Udløber"
              lines={data.next.ending}
              empty="Ingen abonnementer udløber."
              note="Beløbet er det, abonnementet gav pr. måned."
              tone="neg"
            />
            <Lines
              title="Prøveperioder slutter"
              lines={data.next.trialsEnding}
              empty="Ingen prøveperioder slutter."
              note="Mulig omsætning efter prislisten, hvis de vælger månedlig betaling."
              tone="warn"
            />
          </div>
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Kundekategorier</h2>
            <span className="bx-muted">
              Privatpersoner tæller konti. Banker, ejendomsmæglere og skoler tæller firmaaftaler; deres brugere er de konti, der er knyttet til
              aftalen.
            </span>
          </div>
          <div className="bx-card bx-scroll-x">
            <table className="bx-table">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th className="r">Kunder</th>
                  <th className="r">Betalende kunder</th>
                  <th className="r">Brugere</th>
                  <th className="r">Aktive</th>
                  <th className="r">Betalende brugere</th>
                  <th className="r">MRR</th>
                  <th className="r">Næste måned</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((c) => (
                  <tr key={c.id}>
                    <td>{c.label}</td>
                    <td className="r">{num(c.customers)}</td>
                    <td className="r">{num(c.payingCustomers)}</td>
                    <td className="r">{num(c.logins)}</td>
                    <td className="r">{num(c.active)}</td>
                    <td className="r">{num(c.paying)}</td>
                    <td className="r">{kr(c.mrr)}</td>
                    <td className="r">{kr(c.nextMonth)}</td>
                  </tr>
                ))}
                <tr className="ow-total">
                  <td>I alt</td>
                  <td className="r">{num(total.customers)}</td>
                  <td className="r">{num(total.payingCustomers)}</td>
                  <td className="r">{num(total.logins)}</td>
                  <td className="r">{num(total.active)}</td>
                  <td className="r">{num(total.paying)}</td>
                  <td className="r">{kr(Math.round(total.mrr * 100) / 100)}</td>
                  <td className="r">{kr(Math.round(total.nextMonth * 100) / 100)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <details className="bx-section ow-fold">
          <summary className="bx-section-head">
            <h2>De næste 12 måneder</h2>
            <span className="ow-fold-sum">
              {kr(Math.round(year.revenue * 100) / 100)} ind · {kr(Math.round(year.expenses * 100) / 100)} ud · Resultat{" "}
              <b className={yearResult < 0 ? "neg" : "pos"}>{kr(yearResult)}</b>
              {negMonths ? (
                <span className="bx-tag is-neg">
                  {num(negMonths)} {negMonths === 1 ? "måned" : "måneder"} med underskud
                </span>
              ) : null}
            </span>
          </summary>
          <p className="bx-muted ow-fold-note">Kendte abonnementer og udgifter. Nye kunder og opsigelser er ikke regnet med.</p>
          <div className="bx-card bx-scroll-x">
            <table className="bx-table ow-months">
              <thead>
                <tr>
                  <th>Måned</th>
                  <th className="r">Omsætning</th>
                  <th className="r">Udgifter</th>
                  <th className="r">Resultat</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => {
                  const res = Math.round((m.revenue - m.expenses) * 100) / 100;
                  return (
                    <tr key={m.label}>
                      <td>{m.label}</td>
                      <td className="r">{kr(m.revenue)}</td>
                      <td className="r">{kr(m.expenses)}</td>
                      <td className={`r ${res < 0 ? "neg" : res > 0 ? "pos" : ""}`}>{kr(res)}</td>
                      <td className="ow-bars" aria-hidden="true">
                        <i className="ow-bar is-rev" style={{ width: `${(m.revenue / maxMonth) * 100}%` }} />
                        <i className="ow-bar is-exp" style={{ width: `${(m.expenses / maxMonth) * 100}%` }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Firmaaftaler</h2>
            <button type="button" className="bx-btn bx-btn-primary" onClick={() => setEditing({ kind: "org" })}>
              Ny firmaaftale
            </button>
          </div>
          {data.orgs.length ? (
            <div className="bx-card bx-scroll-x">
              <table className="bx-table">
                <thead>
                  <tr>
                    <th>Navn</th>
                    <th>Kategori</th>
                    <th>Aftale</th>
                    <th>Start</th>
                    <th className="r">Pladser</th>
                    <th className="r">Brugere</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orgs.map((o) => (
                    <tr key={o.id} className="clickable" onClick={() => setEditing({ kind: "org", org: o })}>
                      <td>
                        <b>{o.name}</b>
                      </td>
                      <td>{catLabel(o.category)}</td>
                      <td>{planText(o.plan)}</td>
                      <td>{date(o.plan?.start)}</td>
                      <td className="r">{seatsText(o)}</td>
                      <td className="r">
                        {num(o.logins)} <span className="bx-muted">({num(o.accounts)} konti)</span>
                      </td>
                      <td>
                        <StatusTag status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bx-empty">Ingen firmaaftaler endnu. Opret en bank, ejendomsmægler eller skole med kundeadmins og en pakke pladser.</div>
          )}
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Kunder</h2>
            <span className="bx-muted">
              {num(customers.length)} {customers.length === 1 ? "konto" : "konti"}. Sidst aktiv står med gult, når budgettet ikke er åbnet i 30 dage.
            </span>
          </div>
          <div className="ow-filters">
            <div className="bx-seg" role="group" aria-label="Kategori">
              {[{ id: "alle" as const, label: "Alle" }, ...CATEGORIES].map((c) => (
                <button key={c.id} type="button" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
            <input
              className="bx-input ow-search"
              type="search"
              placeholder="Søg navn, e-mail eller firma"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Søg i kunder"
            />
          </div>
          {customers.length ? (
            <div className="bx-card bx-scroll-x">
              <table className="bx-table">
                <thead>
                  <tr>
                    <th>Navn</th>
                    <th>Firmaaftale</th>
                    <th className="r">Brugere</th>
                    <th>Oprettet</th>
                    <th>Sidst aktiv</th>
                    <th>Abonnement</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <b>{c.name}</b>
                        <div className="bx-muted">{c.email}</div>
                      </td>
                      <td>
                        <select
                          className="bx-select ow-org"
                          value={c.org?.id ?? ""}
                          aria-label={`Firmaaftale for ${c.name}`}
                          onChange={(e) => void send({ type: "account", id: c.id, org: e.target.value || null })}
                        >
                          <option value="">Privatperson</option>
                          {data.orgs.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({catLabel(o.category)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="r">{num(c.logins)}</td>
                      <td>{date(c.createdAt)}</td>
                      <td className={c.lastSeen && c.lastSeen.slice(0, 10) < staleBefore ? "warn" : undefined}>{date(c.lastSeen)}</td>
                      <td>
                        {c.org ? (
                          <span className="bx-muted">Via firmaaftale</span>
                        ) : (
                          <button type="button" className="bx-btn-link" onClick={() => setEditing({ kind: "plan", customer: c })}>
                            {c.plan ? planText(c.plan) : "Tilføj abonnement"}
                          </button>
                        )}
                      </td>
                      <td>
                        <StatusTag status={c.status} trialEnds={c.trialEnds} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bx-empty">Ingen kunder passer til filteret.</div>
          )}
          {error && !editing ? (
            <p className="bx-error" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Udgifter</h2>
            <button type="button" className="bx-btn bx-btn-primary" onClick={() => setEditing({ kind: "expense" })}>
              Ny udgift
            </button>
          </div>
          {data.expenses.length ? (
            <div className="bx-card bx-scroll-x">
              <table className="bx-table">
                <thead>
                  <tr>
                    <th>Udgift</th>
                    <th>Betaling</th>
                    <th className="r">Beløb</th>
                    <th>Start</th>
                    <th>Slut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((e) => (
                    <tr key={e.id} className="clickable" onClick={() => setEditing({ kind: "expense", expense: e })}>
                      <td>
                        <b>{e.name}</b>
                      </td>
                      <td>{INTERVAL[e.interval]}</td>
                      <td className="r">{kr(e.amount)}</td>
                      <td>{date(e.start)}</td>
                      <td>{date(e.end)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bx-empty">Ingen udgifter endnu. Tilføj fx hosting, mail, domæne og markedsføring.</div>
          )}
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Testbrugere</h2>
            <button
              type="button"
              className="bx-btn bx-btn-danger"
              onClick={async () => {
                if (!window.confirm("Slet budgetterne for TEST1–TEST5? Det kan ikke fortrydes.")) return;
                setResetDone(false);
                if (await send({ type: "resetTestUsers" })) setResetDone(true);
              }}
            >
              Nulstil TEST1–TEST5
            </button>
          </div>
          <div className="bx-empty">
            {resetDone
              ? "TEST1–TEST5 er nulstillet. Næste gang en tester logger ind, starter budgettet forfra."
              : "Sletter de gemte budgetter og sikkerhedskopier for TEST1–TEST5, så testerne starter på et tomt budget. KBJ, GUIDE og DEMO bliver ikke rørt."}
          </div>
        </section>
          </>
        )}
      </main>

      {editing?.kind === "plan" ? (
        <Dialog
          title={`Abonnement · ${editing.customer.name}`}
          onClose={close}
          onSubmit={(f) => void save({ type: "account", id: editing.customer.id, plan: planFrom(f) })}
          foot={
            editing.customer.plan ? (
              <button type="button" className="bx-btn bx-btn-danger" onClick={() => void save({ type: "account", id: editing.customer.id, plan: null })}>
                Fjern abonnement
              </button>
            ) : null
          }
        >
          <PlanFields
            plan={editing.customer.plan}
            logins={editing.customer.logins}
            defaultStart={editing.customer.trialEnds && editing.customer.trialEnds > data.today ? editing.customer.trialEnds : data.today}
          />
          <p className="bx-muted">
            Budgettet har {num(editing.customer.logins)} {editing.customer.logins === 1 ? "bruger" : "brugere"}. Prislisten giver 29 kr pr. måned eller 296 kr pr. år, plus 9 kr / 92 kr for hver ekstra bruger.
          </p>
          {error ? <p className="bx-error" role="alert">{error}</p> : null}
        </Dialog>
      ) : null}

      {editing?.kind === "org" ? (
        <Dialog
          title={editing.org ? editing.org.name : editing.from ? `Ny firmaaftale · ${editing.from.company}` : "Ny firmaaftale"}
          onClose={close}
          onSubmit={(f) => {
            const plan = planFrom(f);
            // From a henvendelse the first pack is in the same dialog; left empty, the agreement is made without one.
            const first = editing.from && String(f.get("count") ?? "").trim() ? packFrom(f) : undefined;
            void saveOrg({
              inquiry: editing.from?.id,
              ...(first ? { pack: first } : {}),
              org: {
                id: editing.org?.id,
                name: f.get("name"),
                category: f.get("category"),
                admins: f.get("admins"),
                note: f.get("note"),
                plan: String(plan.price ?? "").trim() ? plan : null,
              },
            });
          }}
          foot={
            editing.org ? (
              <button type="button" className="bx-btn bx-btn-danger" onClick={() => void save({ type: "deleteOrg", id: editing.org!.id })}>
                Slet aftale
              </button>
            ) : null
          }
        >
          {editing.from ? <InquirySummary q={editing.from} /> : null}
          <Field label="Navn">
            <input className="bx-input" name="name" defaultValue={editing.org?.name ?? editing.from?.company ?? ""} autoFocus />
          </Field>
          <Field label="Kategori">
            <select className="bx-select" name="category" defaultValue={editing.org?.category ?? (editing.from ? sectorCategory(editing.from.sector) : "bank")}>
              {CATEGORIES.filter((c) => c.id !== "privat").map((c) => (
                <option key={c.id} value={c.id as OrgCategory}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Kundeadmins"
            help={`Én e-mail pr. linje, højst ${MAX_ORG_ADMINS}. De giver aftalens pladser til deres brugere ved at skrive en e-mail. Ingen ser koderne. Nye kundeadmins får en mail med et link til /aftale, når du gemmer.`}
          >
            <textarea className="bx-input ow-textarea" name="admins" rows={3} defaultValue={(editing.org?.admins ?? (editing.from ? [editing.from.email] : [])).join("\n")} />
          </Field>
          {editing.org ? (
            <div className="bx-field">
              <span>Pladser</span>
              {editing.org.packs.length ? (
                <div className="bx-card bx-rows">
                  {editing.org.packs.map((p) => (
                    <button key={p.id} type="button" className="bx-row" onClick={() => setEditing({ kind: "pack", org: editing.org!, pack: p })}>
                      <span className="bx-row-name">
                        <b>
                          {num(p.count)} pladser × {months(p.months)}
                        </b>
                        <small>
                          Købt {date(p.bought)} · kan sendes til og med {date(p.sendBy)}
                          {p.price ? ` · ${kr(p.price)}` : ""}
                        </small>
                      </span>
                      <span className="bx-row-amt">
                        {num(p.used)} brugt
                        <small>
                          {num(p.sent)} sendt · {num(p.count - p.sent)} fri
                        </small>
                      </span>
                      <span aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              ) : (
                <small className="bx-muted">Ingen pladser endnu.</small>
              )}
              <div>
                <button type="button" className="bx-btn" onClick={() => setEditing({ kind: "pack", org: editing.org! })}>
                  Tilføj pakke
                </button>
              </div>
            </div>
          ) : editing.from ? (
            <div className="bx-field">
              <span>Første pakke</span>
              <small className="bx-muted">
                {editing.from.pack
                  ? `Udfyldt med det, de valgte i prisberegneren (${packLabel(editing.from.pack)}). Ret det, hvis I er blevet enige om noget andet.`
                  : "De ville tale om pakken først. Udfyld den, når I er enige, eller lad antal stå tomt og tilføj pakken senere."}
              </small>
              <PackFields asked={editing.from.pack} category={sectorCategory(editing.from.sector)} today={data.today} />
            </div>
          ) : (
            <p className="bx-muted">Gem aftalen først, så kan du tilføje pakker med pladser.</p>
          )}
          <PlanFields plan={editing.org?.plan} logins={1} defaultStart={data.today} optional />
          <Field label="Note (valgfri)">
            <input className="bx-input" name="note" defaultValue={editing.org?.note ?? (editing.from ? inquiryNote(editing.from) : "")} />
          </Field>
          {error ? <p className="bx-error" role="alert">{error}</p> : null}
        </Dialog>
      ) : null}

      {editing?.kind === "pack" ? (() => {
        const asked = editing.pack ? undefined : data.inquiries.find((x) => x.org === editing.org.id && x.pack)?.pack;
        return (
        <Dialog
          title={`${editing.pack ? "Pakke" : "Ny pakke"} · ${editing.org.name}`}
          onClose={() => {
            setError("");
            setEditing({ kind: "org", org: editing.org });
          }}
          onSubmit={(f) =>
            void savePack(editing.org.id, {
              type: "pack",
              org: editing.org.id,
              pack: { id: editing.pack?.id, ...packFrom(f) },
            })
          }
          foot={
            editing.pack && !editing.pack.sent ? (
              <button
                type="button"
                className="bx-btn bx-btn-danger"
                onClick={() => void savePack(editing.org.id, { type: "deletePack", org: editing.org.id, id: editing.pack!.id })}
              >
                Slet pakke
              </button>
            ) : null
          }
        >
          <PackFields pack={editing.pack} asked={asked} category={editing.org.category} today={data.today} focus />
          {error ? <p className="bx-error" role="alert">{error}</p> : null}
        </Dialog>
        );
      })() : null}

      {editing?.kind === "expense" ? (
        <Dialog
          title={editing.expense ? editing.expense.name : "Ny udgift"}
          onClose={close}
          onSubmit={(f) =>
            void save({
              type: "expense",
              expense: {
                id: editing.expense?.id,
                name: f.get("name"),
                amount: f.get("amount"),
                interval: f.get("interval"),
                start: f.get("start"),
                end: f.get("end") || undefined,
              },
            })
          }
          foot={
            editing.expense ? (
              <button type="button" className="bx-btn bx-btn-danger" onClick={() => void save({ type: "deleteExpense", id: editing.expense!.id })}>
                Slet udgift
              </button>
            ) : null
          }
        >
          <Field label="Udgift">
            <input className="bx-input" name="name" defaultValue={editing.expense?.name ?? ""} placeholder="Fx hosting" autoFocus />
          </Field>
          <div className="bx-grid-2">
            <Field label="Beløb (kr)">
              <input className="bx-input" name="amount" inputMode="decimal" defaultValue={editing.expense?.amount ?? ""} />
            </Field>
            <Field label="Betaling">
              <select className="bx-select" name="interval" defaultValue={editing.expense?.interval ?? "monthly"}>
                <option value="monthly">Månedlig</option>
                <option value="yearly">Årlig</option>
                <option value="once">Engang</option>
              </select>
            </Field>
          </div>
          <div className="bx-grid-2">
            <Field label="Første betaling">
              <input className="bx-input" type="date" name="start" defaultValue={editing.expense?.start ?? data.today} />
            </Field>
            <Field label="Slutter (valgfri)" help="Første dag uden betaling">
              <input className="bx-input" type="date" name="end" defaultValue={editing.expense?.end ?? ""} />
            </Field>
          </div>
          {error ? <p className="bx-error" role="alert">{error}</p> : null}
        </Dialog>
      ) : null}
    </div>
  );
}
