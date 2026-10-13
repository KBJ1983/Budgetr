"use client";

import { useState } from "react";
import { validateTeacher, type TeacherField, type TeacherInput } from "@/lib/skole";
import { Shell } from "./Shell";
import s from "./skole.module.css";

type Mode = "login" | "opret";
interface Sent {
  email: string;
  devLink?: string;
  devCode?: string;
}

/** The teacher's way in: log in or sign up with the e-mail, then type the 6-digit code from the mail. */
export function TeacherLogin() {
  const [mode, setMode] = useState<Mode>("login");
  const [values, setValues] = useState<TeacherInput>({ name: "", school: "", email: "" });
  const [errors, setErrors] = useState<Partial<Record<TeacherField, string>>>({});
  const [sent, setSent] = useState<Sent | null>(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);

  const set = (k: TeacherField, v: string) => {
    setValues((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const ask = async () => {
    setFail(null);
    if (mode === "opret") {
      const v = validateTeacher(values);
      if (!v.ok) return setErrors(v.errors);
    } else if (!validateTeacher({ ...values, name: "xx", school: "xx" }).ok) {
      return setErrors({ email: "Skriv en gyldig e-mail, fx navn@skole.dk." });
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/skole/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const j = (await r.json().catch(() => ({}))) as { errors?: Partial<Record<TeacherField, string>>; devLink?: string; devCode?: string };
      if (!r.ok) {
        if (j.errors) setErrors(j.errors);
        else setFail("Det lykkedes ikke. Prøv igen om lidt.");
        return;
      }
      setSent({ email: values.email.trim(), devLink: j.devLink, devCode: j.devCode });
    } catch {
      setFail("Der er ingen forbindelse lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell right={<span className={s.teacherPill}>Lærer</span>}>
      <div className={s.start}>
        <div className={s.startBox}>
          {sent ? (
            <CodeEntry sent={sent} mode={mode} onBack={() => setSent(null)} />
          ) : (
            <form
              className={s.stack}
              style={{ gap: 18 }}
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
            >
              <h1 className={s.q}>{mode === "login" ? "Log ind som lærer" : "Opret en lærerbruger"}</h1>
              <p className={s.lead}>
                {mode === "login"
                  ? "Skriv din e-mail. Så sender vi dig en kode, du logger ind med."
                  : "Med en bruger kan du oprette klasser, dele elevkoder og følge elevernes svar. Der er ingen adgangskode – du logger ind med en kode på mail."}
              </p>
              <div className={s.seg} role="group" aria-label="Log ind eller opret bruger">
                {(["login", "opret"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} style={{ flex: 1, height: 40 }}>
                    {m === "login" ? "Log ind" : "Opret bruger"}
                  </button>
                ))}
              </div>
              {mode === "opret" && (
                <>
                  <Field id="laerer-navn" label="Dit navn" value={values.name} error={errors.name} onChange={(v) => set("name", v)} autoComplete="name" />
                  <Field id="laerer-skole" label="Din skole" value={values.school} error={errors.school} onChange={(v) => set("school", v)} autoComplete="organization" />
                </>
              )}
              <Field id="laerer-mail" label="Din e-mail" type="email" value={values.email} error={errors.email} onChange={(v) => set("email", v)} autoComplete="email" placeholder="navn@skole.dk" />
              {fail && (
                <span className={s.err} role="alert">
                  {fail}
                </span>
              )}
              <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy}>
                {mode === "login" ? "Send kode" : "Opret bruger"}
              </button>
            </form>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Field(p: { id: string; label: string; value: string; error?: string; onChange: (v: string) => void; type?: string; autoComplete?: string; placeholder?: string }) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={p.id}>
        {p.label}
      </label>
      <input
        id={p.id}
        className={s.input}
        type={p.type ?? "text"}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        autoComplete={p.autoComplete}
        placeholder={p.placeholder}
        maxLength={p.type === "email" ? 200 : 100}
        aria-invalid={!!p.error}
      />
      {p.error && (
        <span className={s.err} role="alert">
          {p.error}
        </span>
      )}
    </div>
  );
}

function CodeEntry({ sent, mode, onBack }: { sent: Sent; mode: Mode; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const use = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/skole/auth/indlos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: sent.email, code }) });
      if (!r.ok) return setErr("Koden passer ikke eller er udløbet. Tjek mailen, eller bed om en ny kode.");
      window.location.reload();
    } catch {
      setErr("Der er ingen forbindelse lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={s.stack}
      style={{ gap: 18 }}
      onSubmit={(e) => {
        e.preventDefault();
        void use();
      }}
    >
      <h1 className={s.q}>Tjek din mail</h1>
      <p className={s.lead}>
        {mode === "opret" ? "Hvis e-mailen er rigtig" : "Hvis der er en lærerbruger på e-mailen"}, har vi sendt en kode til <b>{sent.email}</b>. Skriv den her, eller åbn linket i
        mailen. Koden virker i 20 minutter.
      </p>
      <div className={s.field}>
        <label className={s.label} htmlFor="laerer-kode">
          Kode fra mailen
        </label>
        <input
          id="laerer-kode"
          className={s.codeInput}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/[^\d ]/g, "").slice(0, 7));
            setErr(null);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123 456"
          aria-invalid={!!err}
        />
        {err && (
          <span className={s.err} role="alert">
            {err}
          </span>
        )}
      </div>
      {sent.devCode && (
        <p className={s.warn}>
          Udvikling – mailen er ikke sendt. Kode: <b data-dev-code>{sent.devCode}</b>
          {sent.devLink && (
            <>
              {" · "}
              <a href={sent.devLink}>Åbn linket</a>
            </>
          )}
        </p>
      )}
      <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy || code.replace(/\s/g, "").length !== 6}>
        Log ind
      </button>
      <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={onBack} style={{ alignSelf: "flex-start" }}>
        Brug en anden e-mail, eller få en ny kode
      </button>
    </form>
  );
}
