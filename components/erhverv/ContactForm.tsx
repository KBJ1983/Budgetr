"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon } from "@/components/landing/icons";
import { SECTORS, validateInquiry, type InquiryField } from "@/lib/erhverv";
import e from "./erhverv.module.css";

type Errors = Partial<Record<InquiryField, string>>;

/** "Hør om en aftale" (lib/erhverv.ts, POST /api/erhverv/kontakt). */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
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
          <select {...a11y("sector")} className={e.input} defaultValue="">
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
      <div className={e.formRow}>
        {field("name", "Dit navn", <input {...a11y("name")} className={e.input} autoComplete="name" />)}
        {field("phone", "Telefon (valgfri)", <input {...a11y("phone")} className={e.input} type="tel" autoComplete="tel" inputMode="tel" />)}
      </div>
      {field("email", "Arbejdsmail", <input {...a11y("email")} className={e.input} type="email" autoComplete="email" inputMode="email" placeholder="navn@firma.dk" />)}
      {field("message", "Hvad kan vi hjælpe med? (valgfri)", <textarea {...a11y("message")} className={`${e.input} ${e.textarea}`} rows={4} placeholder="Fx hvor mange kunder I tænker på" />)}
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
