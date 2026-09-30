"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/Logo";
import { DownloadIcon, LockIcon, PeopleIcon, ShieldIcon } from "@/components/landing/icons";
import { startAccountSession } from "@/lib/store";

/** Only allow in-app redirects. */
export const safeNext = (next: string | undefined) => (next && next.startsWith("/app") ? next : "/app");

// Only promises the product keeps (same as the landing page's Tryghed band).
const TRUST: readonly { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <LockIcon size={18} strokeWidth={1.8} />,
    title: "Ingen adgangskode",
    body: "Du logger ind med en kode eller et link, som vi sender til din e-mail.",
  },
  {
    icon: <ShieldIcon size={18} strokeWidth={1.8} />,
    title: "Ingen adgang til netbanken",
    body: "Vi beder aldrig om login til din bank. Du uploader selv en kontoudskrift, hvis du vil.",
  },
  {
    icon: <PeopleIcon size={18} strokeWidth={1.8} />,
    title: "Dit budget er låst til din konto",
    body: "Det kan kun åbnes, når du er logget ind med din e-mail.",
  },
  {
    icon: <DownloadIcon size={18} strokeWidth={1.8} />,
    title: "Dine data er dine",
    body: "Eksportér alt som PDF, Excel eller sikkerhedskopi, når som helst.",
  },
];

function TrustPanel() {
  const titleId = useId();
  return (
    <aside className="bx-auth-trust" aria-labelledby={titleId}>
      <span className="bx-auth-eyebrow">
        <ShieldIcon size={15} strokeWidth={2} /> Tryghed
      </span>
      <h2 id={titleId}>Et gratis budget, hvor du bestemmer over dine tal.</h2>
      <p className="bx-auth-check">
        Tjek at der står <b>budgetpro.dk</b> i adresselinjen, før du skriver din e-mail. Mails fra os kommer altid fra
        en adresse, der slutter på @budgetpro.dk.
      </p>
      <ul className="bx-auth-points">
        {TRUST.map((t) => (
          <li key={t.title}>
            <span className="bx-auth-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span>
              <b>{t.title}</b>
              <span>{t.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * Page frame for /login, /opret and /login/bekraeft (styles in app/login/app.css): the landing page's dark card,
 * with the form and, next to it (below it on phones), what makes the page trustworthy.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bx bx-auth">
      <div className="bx-auth-card">
        <div className="bx-auth-circle" aria-hidden="true" />
        <header className="bx-auth-top">
          <Link href="/" className="bx-auth-brand" aria-label="budgetpro – til forsiden">
            <Wordmark fontSize={23} dark />
          </Link>
          <Link href="/" className="bx-auth-back">
            Til forsiden
          </Link>
        </header>
        <div className="bx-auth-grid">
          <main className="bx-auth-panel">{children}</main>
          <TrustPanel />
        </div>
      </div>
    </div>
  );
}

/**
 * "Check your mail" after a link has been requested, with a field for the mailed code: the mail may be read on
 * another device (a phone) than the one logging in, and the link logs in where it is opened.
 */
export function MailSent({
  title,
  email,
  next,
  isNew,
  devLink,
  devCode,
  onBack,
  children,
}: {
  title: string;
  email: string;
  next?: string;
  isNew?: boolean;
  devLink?: string;
  devCode?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const tried = useRef("");
  const inputId = useId();
  const errorId = useId();

  const submit = async (value = code) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("Koden har 6 cifre. Du finder den øverst i mailen.");
      return;
    }
    tried.current = digits;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: digits }),
      });
      if (r.status === 400) {
        setError("Koden passer ikke, eller den er udløbet. Tjek mailen, eller bed om en ny med knappen herunder.");
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { id: string; name: string };
      startAccountSession(j.id, j.name);
      // /app is the original static app, outside the Next router: do a full navigation.
      window.location.assign(safeNext(next));
    } catch {
      setError("Det lykkedes ikke lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1>{title}</h1>
      {children}
      <form
        className="bx-auth-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="bx-field" htmlFor={inputId}>
          <span>Kode fra mailen</span>
        </label>
        <input
          id={inputId}
          className="bx-input bx-auth-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={7}
          placeholder="123 456"
          value={code}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d ]/g, "");
            setCode(v);
            setError("");
            // A pasted or autofilled code is sent at once (but the same wrong code only once).
            const digits = v.replace(/\D/g, "");
            if (digits.length === 6 && digits !== tried.current && !busy) void submit(v);
          }}
        />
        {error ? (
          <p id={errorId} className="bx-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="bx-btn bx-btn-primary bx-btn-lg" disabled={busy}>
          {busy ? "Et øjeblik …" : isNew ? "Bekræft og fortsæt" : "Log ind"}
        </button>
      </form>
      <p className="bx-help" style={{ marginTop: 16 }}>
        Du kan også åbne linket i mailen. Så bliver du logget ind på den enhed, hvor du åbner det.
      </p>
      <button type="button" className="bx-btn bx-auth-secondary" onClick={onBack}>
        Ret e-mail eller send en ny mail
      </button>
      <DevLink href={devLink} code={devCode} />
    </AuthShell>
  );
}

/** Local development without a mail provider: the API hands back the link and code, so they can be used here. */
export function DevLink({ href, code }: { href?: string; code?: string }) {
  if (!href) return null;
  return (
    <div className="bx-note is-info" style={{ marginTop: 20 }}>
      <span>
        Udviklingstilstand: der er ikke sat en mailudbyder op, så mailen er ikke sendt.{" "}
        {code ? <>Koden er <b>{code}</b>, eller </> : null}
        <a href={href}>åbn linket her</a>.
      </span>
    </div>
  );
}
