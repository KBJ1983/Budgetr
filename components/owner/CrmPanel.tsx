"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AGAIN_MONTHS,
  CLOSED,
  EVENT_KINDS,
  IN_DIALOG,
  MAX_SUBJECT,
  MAX_TEXT,
  OUTCOMES,
  PRIOS,
  SEGMENTS,
  STATUSES,
  kindLabel,
  segLabel,
  sortLeads,
  statusLabel,
  type CrmContact,
  type CrmEvent,
  type Lead,
  type LeadStatus,
  type LeadSummary,
  type Outcome,
  type Segment,
} from "@/lib/crm";

// The "Salg" tab on /admin: the owner's sales CRM (lib/crm.ts). A list of leads with follow-ups first, and one lead
// at a time with its contacts, what was said and sent (the timeline) and what it led to.

const num = (n: number) => n.toLocaleString("da-DK");
const kr = (n: number) => `${n.toLocaleString("da-DK")} kr`;
const date = (iso?: string) => {
  if (!iso) return "–";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};
const time = (iso: string) =>
  `${date(iso)} kl. ${new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" })}`;
const todayDk = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
const fold = (s: string) => s.toLowerCase().normalize("NFKD");

const ERRORS: Record<string, string> = {
  lead: "Leadet findes ikke længere.",
  status: "Vælg en status og en gyldig dato.",
  contact: "Tjek kontakten: den skal have et navn, og e-mailen skal være gyldig.",
  log: "Skriv hvad der blev sagt eller aftalt.",
  outcome: "Vælg hvor mange måneder, før I skal tage kontakt igen.",
  details: "Skriv et navn og vælg en type.",
  mail: `Skriv både en emnelinje og en tekst (højst ${num(MAX_TEXT)} tegn).`,
  consent: "Bekræft, at personen har sagt ja til at få mail.",
  // MAX_MAILS_PER_LEAD_DAY / MAX_MAILS_PER_DAY in lib/crm.ts.
  mailLimit: "Grænsen for mails er nået for i dag (5 pr. lead, 40 i alt). Prøv igen i morgen.",
  send: "Mailen kunne ikke sendes. Prøv igen om lidt.",
  import: "Filen indeholder ingen leads. Vælg leads.json fra researchen.",
  change: "Ændringen kunne ikke gemmes.",
};

type Api = { leads?: LeadSummary[]; lead?: Lead; sent?: boolean; added?: number; updated?: number; error?: string };

async function call(body: object | null, id?: string): Promise<Api> {
  const r = body
    ? await fetch("/api/owner/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    : await fetch(`/api/owner/crm${id ? `?id=${encodeURIComponent(id)}` : ""}`, { cache: "no-store" });
  const j = (await r.json().catch(() => ({}))) as Api;
  if (!r.ok) return { error: j.error ?? "change" };
  return j;
}

function StatusTag({ s }: { s: LeadStatus }) {
  const tone = s === "vundet" ? "" : s === "tabt" ? " is-neg" : s === "ny" ? " is-muted" : s === "senere" ? " is-muted" : " is-warn";
  return <span className={`bx-tag${tone}`}>{statusLabel(s)}</span>;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="bx-tile">
      <span>{label}</span>
      <b>{value}</b>
      <span>{sub}</span>
    </div>
  );
}

/** Outcome picker shared by the log form and the mail form; months only for "Kontakt igen om …". */
function OutcomeFields({ outcome, setOutcome }: { outcome: Outcome; setOutcome: (o: Outcome) => void }) {
  return (
    <div className="crm-row">
      <label className="bx-field">
        <span>Udfald</span>
        <select className="bx-input" name="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
          {OUTCOMES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {outcome === "senere" ? (
        <label className="bx-field">
          <span>Kontakt igen om</span>
          <select className="bx-input" name="months" defaultValue="3">
            {AGAIN_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m} {m === 1 ? "måned" : "måneder"}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function CrmPanel() {
  const today = todayDk();
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [seg, setSeg] = useState<Segment | "alle">("alle");
  const [q, setQ] = useState("");
  const [kom, setKom] = useState("");
  const [prio, setPrio] = useState("");
  const [status, setStatus] = useState<"aktive" | "alle" | "opfoelg" | LeadStatus>("aktive");
  const [openId, setOpenId] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    call(null).then((r) => (r.error ? setError(ERRORS[r.error] ?? ERRORS.change!) : setLeads(r.leads ?? [])));
  }, []);
  // A lead opens from the list and from the address (#salg/<id>), so it can be bookmarked.
  useEffect(() => {
    const m = /^#salg\/([a-z0-9-]+)$/.exec(location.hash);
    if (m) setOpenId(m[1]!);
  }, []);
  useEffect(() => {
    if (!openId) return setLead(null);
    setLead(null);
    call(null, openId).then((r) => (r.lead ? setLead(r.lead) : setError(ERRORS[r.error ?? "lead"]!)));
  }, [openId]);
  const open = (id: string | null) => {
    setError("");
    setNotice("");
    setOpenId(id);
    history.replaceState(null, "", id ? `#salg/${id}` : "#salg");
    window.scrollTo({ top: 0 });
  };

  /** Posts one change; the answer brings the fresh list (and lead). */
  const post = async (body: object): Promise<Api | null> => {
    setError("");
    setBusy(true);
    try {
      const r = await call(body);
      if (r.error) {
        setError(ERRORS[r.error] ?? ERRORS.change!);
        return null;
      }
      if (r.leads) setLeads(r.leads);
      if (r.lead) setLead(r.lead);
      return r;
    } catch {
      setError("Det lykkedes ikke at gemme lige nu. Prøv igen om lidt.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    let file: unknown;
    try {
      file = JSON.parse(await f.text());
    } catch {
      return setError(ERRORS.import!);
    }
    const r = await post({ type: "import", file });
    if (r) setNotice(`Indlæst: ${num(r.added ?? 0)} nye leads, ${num(r.updated ?? 0)} opdateret. Dine noter, kontakter og status er bevaret.`);
  };

  const all = leads ?? [];
  const koms = useMemo(
    () => [...new Set(all.filter((l) => seg === "alle" || l.seg === seg).flatMap((l) => l.kommuner))].sort((a, b) => a.localeCompare(b, "da")),
    [all, seg],
  );
  const due = all.filter((l) => l.next && l.next <= today && !CLOSED.includes(l.status));
  const dialog = all.filter((l) => IN_DIALOG.includes(l.status));
  const sold = all.filter((l) => l.status === "vundet");
  const later = all.filter((l) => l.status === "senere");
  const sum = (rows: LeadSummary[]) => rows.reduce((s, l) => s + l.value, 0);
  const needle = fold(q.trim());
  const rows = sortLeads(
    all.filter(
      (l) =>
        (seg === "alle" || l.seg === seg) &&
        (!kom || l.kommuner.includes(kom)) &&
        (!prio || l.prio === prio) &&
        (status === "alle" ||
          (status === "aktive" ? !CLOSED.includes(l.status) : status === "opfoelg" ? due.includes(l) : l.status === status)) &&
        (!needle || fold(`${l.name} ${l.sub} ${l.place} ${l.kommuner.join(" ")} ${l.people}`).includes(needle)),
    ),
    today,
  );

  const banner = (
    <>
      {error ? (
        <div className="bx-note" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      {notice ? (
        <div className="bx-note is-info" role="status">
          <span>{notice}</span>
        </div>
      ) : null}
    </>
  );

  if (openId) {
    return (
      <div className="crm">
        <button type="button" className="bx-btn-link crm-back" onClick={() => open(null)}>
          ← Alle leads
        </button>
        {banner}
        {lead ? <LeadView lead={lead} post={post} busy={busy} onDeleted={() => open(null)} setNotice={setNotice} /> : <p className="bx-muted">Henter …</p>}
      </div>
    );
  }

  return (
    <div className="crm">
      {banner}
      {leads === null ? (
        <p className="bx-muted">Henter leads …</p>
      ) : !leads.length ? (
        <section className="bx-section">
          <div className="bx-card crm-empty">
            <h2>Ingen leads endnu</h2>
            <p className="bx-muted">
              Indlæs researchfilen (leads.json) med banker, ejendomsmæglere, skoler og kommuner, eller opret et lead selv. Filen ligger
              kun hos dig og kommer aldrig i git.
            </p>
            <div className="crm-acts">
              <label className="bx-btn bx-btn-primary crm-file">
                Indlæs researchfil
                <input type="file" accept=".json,application/json" onChange={(e) => importFile(e.target.files?.[0])} disabled={busy} />
              </label>
              <button type="button" className="bx-btn" onClick={() => setCreating(true)}>
                + Nyt lead
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="bx-section">
            <div className="bx-tiles">
              <Tile label="Opfølgning nu" value={num(due.length)} sub={due.length ? "Dato i dag eller overskredet" : "Ingen venter"} />
              <Tile label="I dialog" value={num(dialog.length)} sub={sum(dialog) ? `Forventet ${kr(sum(dialog))}` : "Dialog, møde eller tilbud"} />
              <Tile label="Solgt" value={num(sold.length)} sub={sum(sold) ? kr(sum(sold)) : "Endnu ingen"} />
              <Tile
                label="Kontaktet"
                value={`${num(all.filter((l) => l.status !== "ny").length)} af ${num(all.length)}`}
                sub={later.length ? `${num(later.length)} venter på at blive kontaktet igen` : "Leads i alt"}
              />
            </div>
          </section>

          <section className="bx-section">
            <div className="crm-tools">
              <div className="bx-chips" role="group" aria-label="Type">
                {[{ id: "alle" as const, label: "Alle" }, ...SEGMENTS].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="bx-chip"
                    aria-pressed={seg === s.id}
                    onClick={() => {
                      setSeg(s.id);
                      setKom("");
                    }}
                  >
                    {s.label} <span className="crm-count">{num(s.id === "alle" ? all.length : all.filter((l) => l.seg === s.id).length)}</span>
                  </button>
                ))}
              </div>
              <div className="crm-filters">
                <input className="bx-input" type="search" placeholder="Søg navn, by eller person" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Søg" />
                <select className="bx-input" value={kom} onChange={(e) => setKom(e.target.value)} aria-label="Kommune">
                  <option value="">Alle kommuner</option>
                  {koms.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <select className="bx-input" value={prio} onChange={(e) => setPrio(e.target.value)} aria-label="Prioritet">
                  <option value="">Alle prioriteter</option>
                  {PRIOS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <select className="bx-input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
                  <option value="aktive">Åbne (ikke solgt eller tabt)</option>
                  <option value="opfoelg">Opfølgning nu</option>
                  <option value="alle">Alle statusser</option>
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="bx-btn bx-btn-primary" onClick={() => setCreating(true)}>
                  + Nyt lead
                </button>
              </div>
            </div>
            <div className="bx-card bx-scroll-x">
              <table className="bx-table crm-table">
                <thead>
                  <tr>
                    <th>Prio</th>
                    <th>Lead</th>
                    <th>Status</th>
                    <th>Opfølgning</th>
                    <th className="r">Kontakter</th>
                    <th>Seneste</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const late = l.next && l.next <= today && !CLOSED.includes(l.status);
                    return (
                      <tr key={l.id} className="crm-tr" onClick={() => open(l.id)}>
                        <td>
                          <span className={`crm-prio is-${l.prio || "x"}`}>{l.prio || "–"}</span>
                        </td>
                        <td>
                          <button type="button" className="crm-name" onClick={(e) => (e.stopPropagation(), open(l.id))}>
                            {l.name}
                          </button>
                          <small className="bx-muted">{[l.sub, l.place, l.metric].filter(Boolean).join(" · ")}</small>
                        </td>
                        <td>
                          <StatusTag s={l.status} />
                        </td>
                        <td className={late ? "crm-late" : ""}>{l.next ? date(l.next) : "–"}</td>
                        <td className="r">{num(l.contacts)}</td>
                        <td>{l.lastAt ? `${kindLabel(l.lastKind || "note")} ${date(l.lastAt)}` : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length ? <p className="bx-muted crm-none">Ingen leads passer til filtrene.</p> : null}
            </div>
            <div className="crm-foot">
              <span className="bx-muted">
                {num(rows.length)} vist. Første kontakt bør være telefon eller LinkedIn: markedsføringsloven § 10 forbyder uopfordret
                mail, også til virksomheder.
              </span>
              <label className="bx-btn-link crm-file">
                Opdatér fra researchfil
                <input type="file" accept=".json,application/json" onChange={(e) => importFile(e.target.files?.[0])} disabled={busy} />
              </label>
            </div>
          </section>
        </>
      )}
      {creating ? (
        <DetailsDialog
          title="Nyt lead"
          onClose={() => setCreating(false)}
          onSave={async (lead) => {
            const r = await post({ type: "create", lead });
            if (r?.lead) {
              setCreating(false);
              open(r.lead.id);
            }
          }}
        />
      ) : null}
    </div>
  );
}

/** Name, type, place, kommuner, priority and expected value of a lead – new or existing. */
function DetailsDialog({ title, lead, onClose, onSave }: { title: string; lead?: Lead; onClose: () => void; onSave: (x: object) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSave(Object.fromEntries(["seg", "name", "sub", "place", "kommuner", "prio", "value"].map((k) => [k, String(f.get(k) ?? "")])));
  };
  return (
    <dialog ref={ref} className="bx-dialog" onClose={onClose} onCancel={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="bx-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="bx-btn" onClick={onClose} aria-label="Luk">
            ✕
          </button>
        </div>
        <div className="bx-dialog-body crm-form">
          <label className="bx-field">
            <span>Navn</span>
            <input className="bx-input" name="name" defaultValue={lead?.name} required autoFocus />
          </label>
          <div className="crm-row">
            <label className="bx-field">
              <span>Type</span>
              <select className="bx-input" name="seg" defaultValue={lead?.seg ?? "bank"}>
                {SEGMENTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="bx-field">
              <span>Prioritet</span>
              <select className="bx-input" name="prio" defaultValue={lead?.prio ?? "B"}>
                <option value="">Ingen</option>
                {PRIOS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="bx-field">
            <span>Beskrivelse</span>
            <input className="bx-input" name="sub" defaultValue={lead?.sub} placeholder="Fx Lokal bank, Kæde, Folkeskole" />
          </label>
          <label className="bx-field">
            <span>Sted</span>
            <input className="bx-input" name="place" defaultValue={lead?.place} placeholder="Fx Herning" />
          </label>
          <label className="bx-field">
            <span>Kommuner</span>
            <input className="bx-input" name="kommuner" defaultValue={lead?.kommuner.join(", ")} placeholder="Adskil med komma" />
          </label>
          <label className="bx-field">
            <span>Forventet værdi (kr inkl. moms)</span>
            <input className="bx-input" name="value" inputMode="numeric" defaultValue={lead?.value ? String(lead.value) : ""} placeholder="Dit eget skøn" />
          </label>
        </div>
        <div className="bx-dialog-foot">
          <div />
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

function LeadView({
  lead,
  post,
  busy,
  onDeleted,
  setNotice,
}: {
  lead: Lead;
  post: (b: object) => Promise<Api | null>;
  busy: boolean;
  onDeleted: () => void;
  setNotice: (s: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contactForm, setContactForm] = useState<string | null>(null); // contact id, or "ny"
  const [mailTo, setMailTo] = useState<string | null>(null);
  const [confirmContact, setConfirmContact] = useState<string | null>(null);
  const [logOutcome, setLogOutcome] = useState<Outcome>("");
  const change = (c: object) => post({ type: "change", id: lead.id, change: c });
  const byId = new Map(lead.contacts.map((c) => [c.id, c]));
  const events = [...lead.events].sort((a, b) => b.at.localeCompare(a.at));

  const submitLog = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const r = await change({
      type: "log",
      kind: f.get("kind"),
      contact: f.get("contact"),
      at: f.get("at"),
      text: f.get("text"),
      outcome: f.get("outcome") ?? "",
      months: f.get("months"),
    });
    if (r) {
      form.reset();
      setLogOutcome("");
    }
  };

  return (
    <>
      <section className="bx-section crm-head">
        <div>
          <span className="bx-eyebrow">
            {segLabel(lead.seg)}
            {lead.prio ? ` · prioritet ${lead.prio}` : ""}
          </span>
          <h2>{lead.name}</h2>
          <p className="bx-muted">{[lead.sub, lead.place, lead.kommuner.join(", ")].filter(Boolean).join(" · ")}</p>
          {lead.prioWhy ? <p className="bx-muted crm-why">{lead.prioWhy}</p> : null}
        </div>
        <div className="crm-acts">
          <button type="button" className="bx-btn" onClick={() => setEditing(true)}>
            Ret oplysninger
          </button>
          {confirmDelete ? (
            <>
              <span>Slet {lead.name} med kontakter og historik?</span>
              <button type="button" className="bx-btn ow-danger" onClick={async () => (await post({ type: "delete", id: lead.id })) && onDeleted()}>
                Ja, slet
              </button>
              <button type="button" className="bx-btn" onClick={() => setConfirmDelete(false)}>
                Behold
              </button>
            </>
          ) : (
            <button type="button" className="bx-btn-link ow-danger-link" onClick={() => setConfirmDelete(true)}>
              Slet lead
            </button>
          )}
        </div>
      </section>

      <div className="crm-grid">
        <div className="crm-main">
          <section className="bx-card crm-status">
            <label className="bx-field">
              <span>Status</span>
              <select className="bx-input" value={lead.status} onChange={(e) => change({ type: "status", status: e.target.value, next: lead.next })} disabled={busy}>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="bx-field">
              <span>Næste opfølgning</span>
              <input
                className="bx-input"
                type="date"
                value={lead.next}
                onChange={(e) => change({ type: "status", status: lead.status, next: e.target.value })}
                disabled={busy}
              />
            </label>
            <div className="bx-field">
              <span>Forventet værdi</span>
              <b className="crm-value">{lead.value ? kr(lead.value) : "–"}</b>
            </div>
            {lead.status === "tabt" && lead.lostWhy ? <p className="bx-muted crm-lost">Begrundelse: {lead.lostWhy}</p> : null}
          </section>

          <section className="bx-card">
            <h3 className="crm-h">Log en samtale</h3>
            <form className="crm-form" onSubmit={submitLog}>
              <div className="crm-row">
                <label className="bx-field">
                  <span>Hvad</span>
                  <select className="bx-input" name="kind" defaultValue="opkald">
                    {EVENT_KINDS.filter((k) => k.id !== "mail").map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="bx-field">
                  <span>Med</span>
                  <select className="bx-input" name="contact" defaultValue="">
                    <option value="">Ingen bestemt</option>
                    {lead.contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="bx-field">
                  <span>Dato</span>
                  <input className="bx-input" type="date" name="at" defaultValue={todayDk()} max={todayDk()} />
                </label>
              </div>
              <label className="bx-field">
                <span>Hvad blev sagt eller aftalt</span>
                <textarea className="bx-input ow-textarea" name="text" rows={3} maxLength={MAX_TEXT} required />
              </label>
              <OutcomeFields outcome={logOutcome} setOutcome={setLogOutcome} />
              <div>
                <button type="submit" className="bx-btn bx-btn-primary" disabled={busy}>
                  Gem i historikken
                </button>
              </div>
            </form>
          </section>

          <section className="bx-card">
            <h3 className="crm-h">Historik</h3>
            {events.length ? (
              <ul className="crm-timeline">
                {events.map((e) => (
                  <TimelineItem key={e.id} e={e} who={e.contact ? byId.get(e.contact)?.name : undefined} onDelete={() => change({ type: "eventDelete", eventId: e.id })} />
                ))}
              </ul>
            ) : (
              <p className="bx-muted">Intet logget endnu. Log første opkald eller møde ovenfor.</p>
            )}
          </section>
        </div>

        <aside className="crm-side">
          <section className="bx-card">
            <div className="crm-h-row">
              <h3 className="crm-h">Kontaktpersoner</h3>
              <button type="button" className="bx-btn" onClick={() => setContactForm("ny")}>
                + Tilføj
              </button>
            </div>
            {contactForm === "ny" ? (
              <ContactForm onCancel={() => setContactForm(null)} onSave={async (c) => (await change({ type: "contact", contact: c })) && setContactForm(null)} />
            ) : null}
            {lead.contacts.length ? (
              <ul className="crm-people">
                {lead.contacts.map((c) => (
                  <li key={c.id} className="crm-person">
                    {contactForm === c.id ? (
                      <ContactForm
                        c={c}
                        onCancel={() => setContactForm(null)}
                        onSave={async (x) => (await change({ type: "contact", contact: { ...x, id: c.id } })) && setContactForm(null)}
                      />
                    ) : (
                      <>
                        <b>{c.name}</b>
                        {c.title ? <span className="bx-muted">{c.title}</span> : null}
                        <span className="crm-ways">
                          {c.phone ? <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a> : null}
                          {c.email ? <span className="crm-sel">{c.email}</span> : null}
                          {!c.phone && !c.email ? <span className="bx-muted">Ingen telefon eller e-mail endnu</span> : null}
                        </span>
                        {c.note ? <span className="crm-note">{c.note}</span> : null}
                        <span className="crm-small">
                          {c.source === "research" ? "Fra research" : "Tilføjet af dig"}
                          {c.src ? (
                            <>
                              {" · "}
                              <a href={c.src} target="_blank" rel="noopener noreferrer">
                                Kilde
                              </a>
                            </>
                          ) : null}
                        </span>
                        {confirmContact === c.id ? (
                          <span className="crm-acts">
                            <span>Slet {c.name}?</span>
                            <button type="button" className="bx-btn ow-danger" onClick={() => change({ type: "contactDelete", contactId: c.id })}>
                              Ja, slet
                            </button>
                            <button type="button" className="bx-btn" onClick={() => setConfirmContact(null)}>
                              Behold
                            </button>
                          </span>
                        ) : (
                          <span className="crm-acts">
                            {c.email ? (
                              <button type="button" className="bx-btn" onClick={() => setMailTo(mailTo === c.id ? null : c.id)}>
                                Skriv mail
                              </button>
                            ) : null}
                            <button type="button" className="bx-btn-link" onClick={() => setContactForm(c.id)}>
                              Ret
                            </button>
                            <button type="button" className="bx-btn-link ow-danger-link" onClick={() => setConfirmContact(c.id)}>
                              Slet
                            </button>
                          </span>
                        )}
                        {mailTo === c.id ? (
                          <MailForm
                            c={c}
                            busy={busy}
                            onCancel={() => setMailTo(null)}
                            onSend={async (m) => {
                              const r = await post({ type: "mail", id: lead.id, contactId: c.id, ...m });
                              if (r) {
                                setMailTo(null);
                                setNotice(r.sent ? `Mailen til ${c.name} er sendt og gemt i historikken.` : "Mail er ikke sat op endnu, så mailen er kun gemt i historikken.");
                              }
                            }}
                          />
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bx-muted">Ingen kontaktpersoner endnu.</p>
            )}
          </section>

          {lead.facts.length || lead.places.length || lead.notes.length || lead.links.length ? (
            <details className="bx-card crm-research">
              <summary>Fra researchen</summary>
              {lead.facts.length ? (
                <dl className="crm-facts">
                  {lead.facts.map((f) => (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>
                        {f.value}
                        {f.est ? <span className="bx-tag is-warn crm-est">estimat</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {lead.places.length ? (
                <>
                  <h4>{lead.placesLabel || "Afdelinger"}</h4>
                  <ul className="crm-list">
                    {lead.places.map((p, i) => (
                      <li key={i}>{[p.name, p.addr, p.town, p.kommune ? `(${p.kommune})` : "", p.phone, p.email].filter(Boolean).join(" · ")}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {lead.notes.length ? (
                <>
                  <h4>Noter</h4>
                  <ul className="crm-list">
                    {lead.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {lead.links.length ? (
                <p className="crm-links">
                  {lead.links.map((u, i) => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                      {i ? `Kilde ${i}` : "Hjemmeside"}
                    </a>
                  ))}
                </p>
              ) : null}
            </details>
          ) : null}
        </aside>
      </div>

      {editing ? (
        <DetailsDialog
          title="Ret oplysninger"
          lead={lead}
          onClose={() => setEditing(false)}
          onSave={async (x) => (await change({ type: "details", lead: x })) && setEditing(false)}
        />
      ) : null}
    </>
  );
}

function TimelineItem({ e, who, onDelete }: { e: CrmEvent; who?: string; onDelete: () => void }) {
  const [sure, setSure] = useState(false);
  return (
    <li className={`crm-ev is-${e.kind}`}>
      <span className="crm-ev-head">
        <b>{kindLabel(e.kind)}</b>
        {who ? ` med ${who}` : ""}
        <span className="bx-muted"> · {e.at.endsWith("T12:00:00.000Z") ? date(e.at) : time(e.at)}</span>
        {e.outcome ? (
          <span className="crm-out">
            → {e.outcome === "senere" && e.again ? `Kontakt igen ${date(e.again)}` : statusLabel(e.outcome)}
          </span>
        ) : null}
      </span>
      {e.kind === "mail" ? (
        <span className="crm-small">
          Til {e.to} · {e.sent ? "sendt" : "ikke sendt (mail er ikke sat op)"} · <b>{e.subject}</b>
        </span>
      ) : null}
      <p>{e.text}</p>
      {e.kind === "mail" && e.sent ? null : sure ? (
        <span className="crm-acts">
          <button type="button" className="bx-btn ow-danger" onClick={onDelete}>
            Ja, slet
          </button>
          <button type="button" className="bx-btn" onClick={() => setSure(false)}>
            Behold
          </button>
        </span>
      ) : (
        <button type="button" className="bx-btn-link ow-danger-link crm-del" onClick={() => setSure(true)}>
          Slet
        </button>
      )}
    </li>
  );
}

function ContactForm({ c, onSave, onCancel }: { c?: CrmContact; onSave: (x: object) => void; onCancel: () => void }) {
  return (
    <form
      className="crm-form crm-contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave(Object.fromEntries(["name", "title", "phone", "email", "note"].map((k) => [k, String(f.get(k) ?? "")])));
      }}
    >
      <label className="bx-field">
        <span>Navn</span>
        <input className="bx-input" name="name" defaultValue={c?.name} required autoFocus />
      </label>
      <label className="bx-field">
        <span>Titel eller rolle</span>
        <input className="bx-input" name="title" defaultValue={c?.title} placeholder="Fx Privatkundedirektør" />
      </label>
      <div className="crm-row">
        <label className="bx-field">
          <span>Telefon</span>
          <input className="bx-input" name="phone" type="tel" defaultValue={c?.phone} />
        </label>
        <label className="bx-field">
          <span>E-mail</span>
          <input className="bx-input" name="email" type="email" defaultValue={c?.email} />
        </label>
      </div>
      <label className="bx-field">
        <span>Note</span>
        <textarea className="bx-input ow-textarea" name="note" rows={2} defaultValue={c?.note} placeholder="Fx assistent, bedste tid at ringe" />
      </label>
      <div className="crm-acts">
        <button type="submit" className="bx-btn bx-btn-primary">
          Gem kontakt
        </button>
        <button type="button" className="bx-btn" onClick={onCancel}>
          Annullér
        </button>
      </div>
    </form>
  );
}

function MailForm({ c, busy, onSend, onCancel }: { c: CrmContact; busy: boolean; onSend: (m: object) => void; onCancel: () => void }) {
  const [outcome, setOutcome] = useState<Outcome>("");
  const first = c.name.split(" ")[0] || c.name;
  return (
    <form
      className="crm-form crm-mail"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSend({
          subject: f.get("subject"),
          text: f.get("text"),
          consent: f.get("consent") === "on",
          outcome: f.get("outcome") ?? "",
          months: f.get("months"),
        });
      }}
    >
      <span className="crm-small">Til {c.email}. Svar kommer til din egen mail.</span>
      <label className="bx-field">
        <span>Emne</span>
        <input className="bx-input" name="subject" maxLength={MAX_SUBJECT} required defaultValue="budgetpro" />
      </label>
      <label className="bx-field">
        <span>Tekst</span>
        <textarea className="bx-input ow-textarea" name="text" rows={7} maxLength={MAX_TEXT} required defaultValue={`Hej ${first}\n\n`} />
      </label>
      <OutcomeFields outcome={outcome} setOutcome={setOutcome} />
      <label className="bx-check">
        <input type="checkbox" name="consent" required />
        <span>{first} har sagt ja til at få mail fra mig, eller mailen svarer på noget, {first} har bedt om.</span>
      </label>
      <div className="crm-acts">
        <button type="submit" className="bx-btn bx-btn-primary" disabled={busy}>
          {busy ? "Sender …" : "Send mail"}
        </button>
        <button type="button" className="bx-btn" onClick={onCancel}>
          Annullér
        </button>
      </div>
    </form>
  );
}
