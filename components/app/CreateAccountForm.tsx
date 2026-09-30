"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { AuthShell, MailSent } from "@/components/app/AuthShell";
import { validateSignup, type SignupField } from "@/lib/signup";

type Values = Record<SignupField, string>;

const FIELDS: { key: SignupField; label: string; autoComplete: string; type?: string; inputMode?: "email" | "tel" }[] = [
  { key: "firstName", label: "Fornavn", autoComplete: "given-name" },
  { key: "lastName", label: "Efternavn", autoComplete: "family-name" },
  { key: "email", label: "E-mail", autoComplete: "email", type: "email", inputMode: "email" },
  { key: "phone", label: "Mobilnummer", autoComplete: "tel-national", type: "tel", inputMode: "tel" },
];

/** Sign up (/opret). The fields are checked here and again on the server (lib/signup.ts), which mails a confirm link. */
export function CreateAccountForm({ email }: { email?: string }) {
  const [values, setValues] = useState<Values>({ firstName: "", lastName: "", email: email ?? "", phone: "" });
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ email: string; devLink?: string; devCode?: string } | null>(null);
  const idBase = useId();

  const showErrors = (errs: Partial<Values>) => {
    setErrors(errs);
    const first = FIELDS.find((f) => errs[f.key]);
    if (first) document.getElementById(`${idBase}-${first.key}`)?.focus();
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const check = validateSignup(values);
    if (!check.ok) return showErrors(check.errors);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = (await r.json().catch(() => ({}))) as { errors?: Partial<Values>; devLink?: string; devCode?: string };
      if (r.status === 400 && j.errors) return showErrors(j.errors);
      if (!r.ok) throw new Error(String(r.status));
      setSent({ email: values.email.trim(), devLink: j.devLink, devCode: j.devCode });
    } catch {
      setError("Vi kunne ikke oprette kontoen lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <MailSent
        title="Bekræft din e-mail"
        email={sent.email}
        isNew
        devLink={sent.devLink}
        devCode={sent.devCode}
        onBack={() => setSent(null)}
      >
        <p className="bx-guide-lead">
          Vi har sendt en kode til <b>{sent.email}</b>. Skriv den herunder for at bekræfte din e-mail. Så kommer du
          direkte videre til dit budget.
        </p>
        <p className="bx-help" style={{ marginBottom: 20 }}>
          Koden virker i 48 timer. Kan du ikke finde mailen, så kig i spam-mappen. Har du allerede en konto med den
          e-mail, får du i stedet en kode til at logge ind.
        </p>
      </MailSent>
    );

  return (
    <AuthShell>
      <h1>Opret gratis konto</h1>
      <p className="bx-guide-lead">
        Udfyld felterne, så sender vi dig en kode, som bekræfter din e-mail. Der er ingen adgangskode – du logger ind
        med en kode eller et link på mail.
      </p>
      <form onSubmit={submit} noValidate className="bx-auth-form">
        {FIELDS.map((f) => {
          const id = `${idBase}-${f.key}`, err = errors[f.key];
          return (
            <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="bx-field" htmlFor={id}>
                <span>{f.label}</span>
              </label>
              <input
                id={id}
                name={f.key}
                className="bx-input"
                type={f.type ?? "text"}
                inputMode={f.inputMode}
                autoComplete={f.autoComplete}
                autoCapitalize={f.key === "email" ? "none" : undefined}
                placeholder={f.key === "email" ? "navn@eksempel.dk" : f.key === "phone" ? "12 34 56 78" : undefined}
                value={values[f.key]}
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? `${id}-err` : undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setValues((s) => ({ ...s, [f.key]: v }));
                  if (err) setErrors((s) => ({ ...s, [f.key]: undefined }));
                }}
              />
              {err ? (
                <p id={`${id}-err`} className="bx-error">
                  {err}
                </p>
              ) : null}
            </div>
          );
        })}
        {error ? (
          <p className="bx-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="bx-btn bx-btn-primary bx-btn-lg" style={{ marginTop: 4 }} disabled={busy}>
          {busy ? "Opretter …" : "Opret konto"}
        </button>
      </form>
      <p className="bx-help" style={{ marginTop: 20 }}>
        Vi bruger kun din e-mail og dit mobilnummer til login og til de påmindelser, du selv slår til.
      </p>
      <p className="bx-help" style={{ marginTop: 8 }}>
        Har du allerede en konto? <Link href="/login">Log ind</Link>.
      </p>
    </AuthShell>
  );
}
