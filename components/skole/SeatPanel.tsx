"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import s from "./skole.module.css";

const CODE_ERRORS: Record<string, string> = {
  unknown: "Koden passer ikke. Tjek mailen fra din skole, eller spørg den, der gav dig adgangen.",
  used: "Koden er allerede brugt af en anden lærerbruger.",
  expired: "Koden er udløbet. Spørg din skole om en ny.",
  notSchool: "Koden er ikke en lærerplads. Den hører til budgetpro, ikke budgetpro Skole.",
};
const ASK_ERRORS: Record<string, string> = {
  limit: "Du har allerede bedt om en plads i dag. Du får en mail, når skolen giver dig adgang.",
  noAdmins: "Skolen har ingen, der kan give adgang endnu. Kontakt budgetpro.",
  unknown: "Vi kan ikke finde skolens aftale. Prøv at skrive navnet igen.",
};
const TRY_AGAIN = "Det lykkedes ikke lige nu. Prøv igen om lidt.";

/**
 * For a teacher without a seat (lib/skole-seats.ts): look at the demo class, use the code from the school's seat
 * mail, or ask a school with an agreement for a seat.
 */
export function SeatPanel({ code: initialCode = "", school, trialUsed = false }: { code?: string; school: string; trialUsed?: boolean }) {
  const [code, setCode] = useState(initialCode);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [typed, setTyped] = useState(school);
  const [matches, setMatches] = useState<string[]>([]);
  const [askMsg, setAskMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // The schools with an agreement whose name matches what the teacher typed (the same lookup as the sign-up).
  useEffect(() => {
    const q = typed.trim();
    if (q.length < 3) {
      setMatches([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/skole/aftale?skole=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (r.ok) setMatches(((await r.json()) as { schools: string[] }).schools);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [typed]);

  const post = async (body: object) => {
    const r = await fetch("/api/skole/plads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 401) {
      window.location.reload();
      return null;
    }
    return { status: r.status, json: (await r.json().catch(() => ({}))) as { error?: string; asked?: string; mailed?: boolean } };
  };

  const submitCode = async () => {
    setBusy(true);
    setCodeMsg(null);
    try {
      const r = await post({ kode: code });
      if (!r) return;
      if (r.status === 200) {
        window.location.replace(window.location.pathname);
        return;
      }
      setCodeMsg(CODE_ERRORS[r.json.error ?? ""] ?? TRY_AGAIN);
    } catch {
      setCodeMsg(TRY_AGAIN);
    } finally {
      setBusy(false);
    }
  };

  const ask = async (name: string) => {
    setBusy(true);
    setAskMsg(null);
    try {
      const r = await post({ skole: name });
      if (!r) return;
      if (r.status === 200 && r.json.mailed) setAskMsg({ ok: true, text: `Vi har bedt ${name} om en plads til dig. Du får en mail med en kode, når de giver dig adgang.` });
      else if (r.status === 200) setAskMsg({ ok: false, text: "Vi kunne ikke sende mailen til skolen lige nu. Prøv igen i morgen, eller tal med din skole." });
      else setAskMsg({ ok: false, text: ASK_ERRORS[r.json.error ?? ""] ?? TRY_AGAIN });
    } catch {
      setAskMsg({ ok: false, text: TRY_AGAIN });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${s.stack} ${s.noPrint}`} style={{ gap: 14 }}>
      <section className={s.card}>
        <span className={s.cardTitle}>Prøv budgetpro Skole</span>
        <span className={s.note}>
          Se en demoklasse med opdigtede elever: hvor langt de er nået, om budgettet går op, og hvad de har svaret.{" "}
          {trialUsed
            ? "Du har brugt din gratis prøveklasse. For at oprette flere klasser skal du have en lærerplads fra din skoles aftale med budgetpro."
            : "For at oprette flere klasser end din gratis prøveklasse skal du have en lærerplads fra din skoles aftale med budgetpro."}
        </span>
        <Link className={`${s.btn} ${s.btnPrimary}`} href="/skole/klasse/demo" style={{ alignSelf: "flex-start" }}>
          Se demoklassen
        </Link>
      </section>

      <form
        className={s.card}
        onSubmit={(e) => {
          e.preventDefault();
          void submitCode();
        }}
      >
        <span className={s.cardTitle}>Har du en kode fra din skole?</span>
        <span className={s.note}>Koden står i mailen, du fik, da skolen gav dig en lærerplads. Den ser sådan ud: ABCD-EFGH.</span>
        <div className={s.seatRow}>
          <input className={s.input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD-EFGH" aria-label="Kode fra din skole" autoCapitalize="characters" />
          <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy || !code.trim()}>
            Brug koden
          </button>
        </div>
        {codeMsg && (
          <span className={s.err} role="alert">
            {codeMsg}
          </span>
        )}
      </form>

      <section className={s.card}>
        <span className={s.cardTitle}>Bed din skole om en plads</span>
        <span className={s.note}>Har din skole en aftale med budgetpro, kan du bede om en lærerplads. Skolens administrator får en mail og giver dig adgang.</span>
        <input className={s.input} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Skolens navn" aria-label="Skolens navn" />
        {matches.length > 0 ? (
          <div className={s.seatRow} style={{ flexWrap: "wrap" }}>
            {matches.map((m) => (
              <button key={m} type="button" className={s.btn} disabled={busy} onClick={() => void ask(m)}>
                Bed {m} om en plads
              </button>
            ))}
          </div>
        ) : typed.trim().length >= 3 ? (
          <span className={s.small}>Vi kender ikke en aftale med en skole med det navn. Fortæl gerne din skole om budgetpro Skole.</span>
        ) : null}
        {askMsg && (
          <span className={askMsg.ok ? s.note : s.err} role={askMsg.ok ? "status" : "alert"}>
            {askMsg.text}
          </span>
        )}
      </section>
    </div>
  );
}
