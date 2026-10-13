"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRightIcon } from "@/components/landing/icons";
import { SECTORS, TALK_FIRST, validateInquiry, type InquiryField } from "@/lib/erhverv";
import {
  DEFAULT_PACK,
  PACK_COUNTS,
  PACK_MONTHS,
  packLabel,
  packMonthly,
  packPrice,
  packYearly,
  perCodeMonth,
  type Billing,
  type PackCount,
  type PackMonths,
} from "@/lib/erhverv-packs";
import e from "./erhverv.module.css";

type Errors = Partial<Record<InquiryField, string>>;

const kr = (n: number) => `${n.toLocaleString("da-DK")} kr`;
const PRIVATE_MONTH = 29;

/**
 * The price calculator and the price request in one form (lib/erhverv.ts, POST /api/erhverv/kontakt). The price is
 * shown a month at a time by default and can be switched to a year. Sending it is only a request: no agreement is
 * made – the owner sends an offer and makes the agreement by hand on /admin.
 */
export function PriceRequest() {
  const [count, setCount] = useState<PackCount>(DEFAULT_PACK.count);
  const [months, setMonths] = useState<PackMonths>(DEFAULT_PACK.months);
  // Estate agents usually give short access, banks long; follow the sector until they pick the months themselves.
  const [monthsPicked, setMonthsPicked] = useState(false);
  const [billing, setBilling] = useState<Billing>("maaned");
  const [talk, setTalk] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ email: string; what: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = { ...Object.fromEntries(new FormData(form)), count: talk ? TALK_FIRST : String(count), months: String(months), billing };
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
      if (res.ok) setSent({ email: r.value.email, what: r.value.pack ? packLabel(r.value.pack) : "" });
      else if (res.status === 429) setFailed("Der er sendt flere forespørgsler fra denne e-mail i dag. Prøv igen i morgen.");
      else if (res.status === 400) setErrors(((await res.json().catch(() => ({}))) as { errors?: Errors }).errors ?? {});
      else setFailed("Det lykkedes ikke at sende lige nu. Prøv igen om lidt.");
    } catch {
      setFailed("Det lykkedes ikke at sende lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className={e.sentCard} role="status">
        <h3 className={e.sentTitle}>Tak. Jeres prisforespørgsel er sendt.</h3>
        <p>
          Der er ikke oprettet en aftale, og I har ikke bundet jer til noget. Vi skriver til <b>{sent.email}</b>
          {sent.what ? <> med et tilbud på {sent.what}</> : <> og finder den rigtige pakke sammen med jer</>}.
        </p>
      </div>
    );

  const field = (name: InquiryField, label: string, input: ReactNode) => (
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

  const total = packPrice(count, months);
  const shortPack = months < 12;

  return (
    <form className={e.calc} onSubmit={submit} noValidate>
      <div className={e.calcChoose}>
        <div className={e.calcHead}>
          <span className={e.step}>1</span>
          <h3>Vælg pakke</h3>
        </div>

        <fieldset className={e.choice} disabled={talk}>
          <legend>Antal koder</legend>
          <p className={e.choiceHint}>Én kode giver én kunde adgang.</p>
          <div className={e.pills}>
            {PACK_COUNTS.map((c) => (
              <label key={c} className={e.pill}>
                <input type="radio" name="calc-count" checked={count === c} onChange={() => setCount(c)} />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={e.choice} disabled={talk}>
          <legend>Varighed pr. kode</legend>
          <p className={e.choiceHint}>Månederne tæller fra den dag, kunden tager koden i brug.</p>
          <div className={e.pills}>
            {PACK_MONTHS.map((m) => (
              <label key={m} className={e.pill}>
                <input
                  type="radio"
                  name="calc-months"
                  checked={months === m}
                  onChange={() => {
                    setMonths(m);
                    setMonthsPicked(true);
                  }}
                />
                <span>{m} mdr.</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={e.priceBox} aria-live="polite">
          {talk ? (
            <p className={e.priceTalk}>Fint. Så finder vi pakken sammen, når vi skriver til jer.</p>
          ) : (
            <>
              <div className={e.billing} role="group" aria-label="Vis prisen">
                <button type="button" aria-pressed={billing === "maaned"} onClick={() => setBilling("maaned")}>
                  Pr. måned
                </button>
                <button type="button" aria-pressed={billing === "aar"} onClick={() => setBilling("aar")}>
                  {shortPack ? "Samlet" : "Pr. år"}
                </button>
              </div>
              <p className={e.priceBig}>
                {billing === "maaned" ? (
                  <>
                    {kr(packMonthly(count, months))}
                    <span> /md.</span>
                  </>
                ) : shortPack ? (
                  kr(total)
                ) : (
                  <>
                    {kr(packYearly(count, months))}
                    <span> /år</span>
                  </>
                )}
              </p>
              <p className={e.priceSub}>
                {billing === "maaned"
                  ? `I ${months} måneder · ${kr(total)} i alt`
                  : shortPack
                    ? `Betalt på én gang for hele pakken på ${months} måneder`
                    : `Betalt én gang om året${months > 12 ? ` i ${months / 12} år` : ""} · ${kr(total)} i alt`}
              </p>
              <p className={e.pricePer}>
                Det er {kr(perCodeMonth(count, months))} pr. kunde om måneden. Privat koster budgetpro {PRIVATE_MONTH} kr om måneden.
              </p>
            </>
          )}
        </div>

        <label className={e.talk}>
          <input type="checkbox" checked={talk} onChange={(ev) => setTalk(ev.target.checked)} />
          <span>Vi vil hellere tale om pakken først</span>
        </label>
        {errors.pack ? <p className={e.fieldError}>{errors.pack}</p> : null}
        <p className={e.packNote}>Pakken er et udgangspunkt, og I kan altid ændre den eller købe flere koder senere.</p>
      </div>

      <div className={e.calcAsk}>
        <div className={e.calcHead}>
          <span className={e.step}>2</span>
          <h3>Få et tilbud</h3>
        </div>
        <p className={e.notice}>
          <b>Det er kun en prisforespørgsel.</b> I opretter ikke en aftale og binder jer ikke til noget. Vi sender et tilbud, og aftalen bliver
          først lavet, når I har sagt ja.
        </p>
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
        <div className={e.formRow}>
          {field("name", "Dit navn", <input {...a11y("name")} className={e.input} autoComplete="name" />)}
          {field("phone", "Telefon (valgfri)", <input {...a11y("phone")} className={e.input} type="tel" autoComplete="tel" inputMode="tel" />)}
        </div>
        {field("email", "Arbejdsmail", <input {...a11y("email")} className={e.input} type="email" autoComplete="email" inputMode="email" placeholder="navn@firma.dk" />)}
        {field("message", "Andet, vi skal vide? (valgfri)", <textarea {...a11y("message")} className={`${e.input} ${e.textarea}`} rows={3} placeholder="Fx hvornår I gerne vil i gang" />)}
        {/* Never shown; bots fill it in. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className={e.trap} aria-hidden="true" />
        {failed ? (
          <p className={e.fieldError} role="alert">
            {failed}
          </p>
        ) : null}
        <button type="submit" className={e.submit} disabled={busy}>
          {busy ? "Sender" : "Send prisforespørgsel"} <ArrowRightIcon size={16} />
        </button>
        <p className={e.formNote}>Vi bruger kun oplysningerne til at svare jer.</p>
      </div>
    </form>
  );
}
