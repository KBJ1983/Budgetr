"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Wordmark } from "@/components/Logo";
import {
  CATEGORIES,
  listPrice,
  type Category,
  type CustomerRow,
  type Expense,
  type Interval,
  type Line,
  type OrgCategory,
  type OrgRow,
  type Overview,
  type Plan,
  type Status,
} from "@/lib/owner";

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
};

function StatusTag({ status, trialEnds }: { status: Status; trialEnds?: string }) {
  switch (status) {
    case "paying":
      return <span className="bx-tag">Betaler</span>;
    case "trial":
      return <span className="bx-tag is-warn">Prøveperiode til {date(trialEnds)}</span>;
    case "ended":
      return <span className="bx-tag is-muted">Udløbet</span>;
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

function Lines({ title, lines, empty, note }: { title: string; lines: Line[]; empty: string; note?: string }) {
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div className="bx-card ow-lines">
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

type Editing =
  | { kind: "plan"; customer: CustomerRow }
  | { kind: "org"; org?: OrgRow }
  | { kind: "expense"; expense?: Expense }
  | null;

export function OwnerDashboard({ initial, dev }: { initial: Overview; dev: boolean }) {
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Category | "alle">("alle");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) setTheme("light");
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
      setData((await r.json()) as Overview);
      return true;
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

  return (
    <div className="bx ow" data-theme={theme}>
      <header className="bx-top">
        <div className="bx-wrap bx-top-row">
          <Link href="/" className="bx-brand" aria-label="budgetpro – til forsiden">
            <Wordmark fontSize={21} dark={theme === "dark"} />
          </Link>
          <div className="bx-top-right">
            <span className="bx-muted">Ejeroverblik · {date(data.today)}</span>
            <button type="button" className="bx-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Lyst tema" : "Mørkt tema"}
            </button>
          </div>
        </div>
      </header>

      <main className="bx-wrap bx-main">
        {dev ? (
          <div className="bx-note is-info">
            <span>
              Udviklingstilstand: siden er åben for alle. I drift kræver den login med en e-mail fra OWNER_EMAILS.
            </span>
          </div>
        ) : null}

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
            />
            <Lines
              title="Prøveperioder slutter"
              lines={data.next.trialsEnding}
              empty="Ingen prøveperioder slutter."
              note="Mulig omsætning efter prislisten, hvis de vælger månedlig betaling."
            />
          </div>
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Kundekategorier</h2>
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
          <p className="bx-muted">
            Privatpersoner tæller konti. Banker, ejendomsmæglere og skoler tæller firmaaftaler; deres brugere er de konti, der er knyttet til aftalen.
          </p>
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>De næste 12 måneder</h2>
            <span className="bx-muted">Kendte abonnementer og udgifter. Nye kunder og opsigelser er ikke regnet med.</span>
          </div>
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
                      <td className={`r${res < 0 ? " ow-neg" : ""}`}>{kr(res)}</td>
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
        </section>

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
                    <th className="r">Licenser</th>
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
                      <td className="r">{o.seats === undefined ? "–" : num(o.seats)}</td>
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
            <div className="bx-empty">Ingen firmaaftaler endnu. Opret en bank, ejendomsmægler eller skole, og knyt deres brugere til aftalen under Kunder.</div>
          )}
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Kunder</h2>
            <span className="bx-muted">{num(customers.length)} {customers.length === 1 ? "konto" : "konti"}</span>
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
                      <td>{date(c.lastSeen)}</td>
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
          title={editing.org ? editing.org.name : "Ny firmaaftale"}
          onClose={close}
          onSubmit={(f) => {
            const plan = planFrom(f);
            void save({
              type: "org",
              org: {
                id: editing.org?.id,
                name: f.get("name"),
                category: f.get("category"),
                seats: f.get("seats"),
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
          <Field label="Navn">
            <input className="bx-input" name="name" defaultValue={editing.org?.name ?? ""} autoFocus />
          </Field>
          <div className="bx-grid-2">
            <Field label="Kategori">
              <select className="bx-select" name="category" defaultValue={editing.org?.category ?? "bank"}>
                {CATEGORIES.filter((c) => c.id !== "privat").map((c) => (
                  <option key={c.id} value={c.id as OrgCategory}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Licenser (valgfri)">
              <input className="bx-input" name="seats" inputMode="numeric" defaultValue={editing.org?.seats ?? ""} />
            </Field>
          </div>
          <PlanFields plan={editing.org?.plan} logins={1} defaultStart={data.today} optional />
          <Field label="Note (valgfri)">
            <input className="bx-input" name="note" defaultValue={editing.org?.note ?? ""} />
          </Field>
          {error ? <p className="bx-error" role="alert">{error}</p> : null}
        </Dialog>
      ) : null}

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
