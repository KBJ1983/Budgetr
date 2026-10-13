"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon } from "@/components/landing/icons";
import { SECTORS, TALK_FIRST, validateInquiry, type InquiryField } from "@/lib/erhverv";
import { DEFAULT_PACK, PACK_COUNTS, PACK_MONTHS, packPrice, perCodeMonth, type PackMonths } from "@/lib/erhverv-packs";
import e from "./erhverv.module.css";

type Errors = Partial<Record<InquiryField, string>>;

const kr = (n: number) => `${n.toLocaleString("da-DK")} kr`;

/** "Hør om en aftale" (lib/erhverv.ts, POST /api/erhverv/kontakt), with the pack of codes they have in mind. */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [count, setCount] = useState<string>(String(DEFAULT_PACK.count));
  const [months, setMonths] = useState<PackMonths>(DEFAULT_PACK.months);
  // Estate agents usually give short access, banks long; follow the sector until they pick the months themselves.
  const [monthsPicked, setMonthsPicked] = useState(false);
  const talk = count === TALK_FIRST;
  const n = Number(count) as (typeof PACK_COUNTS)[number];
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const r = validateInquiry(data);
    setFailed(null);
    if (!r.ok) {
      setErrors(r.errors);
      const first = Object.keys(r.errors)[0];
      if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/erhverv/kontakt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) setSentTo(r.value.email);
      else if (res.status === 429) setFailed("Der er sendt flere henvendelser fra denne e-mail i dag. Prøv igen i morgen.");
      else if (res.status === 400) setErrors(((await res.json().catch(() => ({}))) as { errors?: Errors }).errors ?? {});
      else setFailed("Det lykkedes ikke at sende lige nu. Prøv igen om lidt.");
    } catch {
      setFailed("Det lykkedes ikke at sende lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo)
    return (
      <p className={e.sent} role="status">
        Tak. Vi har fået jeres henvendelse og skriver til {sentTo}.
      </p>
    );

  const field = (name: InquiryField, label: string, input: React.ReactNode) => (
    <div className={e.field}>
      <label htmlFor={`kontakt-${name}`}>{label}</label>
      {input}
      {errors[name] ? (
        <p id={`kontakt-${name}-fejl`} className={e.fieldError}>
          {errors[name]}
        </p>
      ) : null}
    </div>
  );
  const a11y = (name: InquiryField) => ({
    id: `kontakt-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `kontakt-${name}-fejl` : undefined,
  });

  return (
    <form className={e.form} onSubmit={submit} noValidate>
      <div className={e.formRow}>
        {field("company", "Virksomhed", <input {...a11y("company")} className={e.input} autoComplete="organization" />)}
        {field(
          "sector",
          "Branche",
          <select
            {...a11y("sector")}
            className={e.input}
            defaultValue=""
            onChange={(ev) => {
              if (!monthsPicked) setMonths(ev.target.value === "maegler" ? 3 : 12);
            }}
          >
            <option value="" disabled>
              Vælg
            </option>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>,
        )}
      </div>
      <fieldset className={e.pack} aria-describedby={errors.pack ? "kontakt-pack-fejl" : undefined}>
        <legend>Pakke</legend>
        <div className={e.packRow}>
          <div className={e.field}>
            <label htmlFor="kontakt-count">Antal koder</label>
            <select id="kontakt-count" name="count" className={e.input} value={count} onChange={(ev) => setCount(ev.target.value)}>
              {PACK_COUNTS.map((c) => (
                <option key={c} value={c}>
                  {c} koder
                </option>
              ))}
              <option value={TALK_FIRST}>Vi vil hellere tale om det</option>
            </select>
          </div>
          <div className={e.field}>
            <span className={e.packLabel} id="kontakt-months-label">
              Måneder pr. kode
            </span>
            <div className={e.months} role="radiogroup" aria-labelledby="kontakt-months-label">
              {PACK_MONTHS.map((m) => (
                <label key={m} className={e.month}>
                  <input
                    type="radio"
                    name="months"
                    value={m}
                    checked={months === m}
                    disabled={talk}
                    onChange={() => {
                      setMonths(m);
                      setMonthsPicked(true);
                    }}
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <p className={e.packPrice} aria-live="polite">
          {talk ? (
            "Fint. Så finder vi pakken sammen, når vi skriver."
          ) : (
            <>
              <b>{kr(packPrice(n, months))}</b> for {n} koder × {months} måneder, betalt én gang. Det er {kr(perCodeMonth(n, months))} pr. kode pr. måned.
            </>
          )}
        </p>
        <p className={e.packNote}>
          Pakken er et udgangspunkt. I kan altid ændre den, også når aftalen er i gang, og købe flere koder senere. Hver kode gælder fra den dag,
          kunden tager den i brug.
        </p>
        {errors.pack ? (
          <p id="kontakt-pack-fejl" className={e.fieldError}>
            {errors.pack}
          </p>
        ) : null}
      </fieldset>
      <div className={e.formRow}>
        {field("name", "Dit navn", <input {...a11y("name")} className={e.input} autoComplete="name" />)}
        {field("phone", "Telefon (valgfri)", <input {...a11y("phone")} className={e.input} type="tel" autoComplete="tel" inputMode="tel" />)}
      </div>
      {field("email", "Arbejdsmail", <input {...a11y("email")} className={e.input} type="email" autoComplete="email" inputMode="email" placeholder="navn@firma.dk" />)}
      {field("message", "Hvad kan vi hjælpe med? (valgfri)", <textarea {...a11y("message")} className={`${e.input} ${e.textarea}`} rows={4} placeholder="Fx hvornår I gerne vil i gang" />)}
      {/* Never shown; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className={e.trap} aria-hidden="true" />
      {failed ? (
        <p className={e.fieldError} role="alert">
          {failed}
        </p>
      ) : null}
      <button type="submit" className={e.submit} disabled={busy}>
        {busy ? "Sender" : "Send"} <ArrowRightIcon size={16} />
      </button>
      <p className={e.formNote}>Vi bruger kun oplysningerne til at svare jer.</p>
    </form>
  );
}
