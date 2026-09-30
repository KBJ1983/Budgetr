"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/app/AuthShell";
import { startAccountSession } from "@/lib/store";

/**
 * Opened from the mailed link (/login/bekraeft?t=…[&ny=1]). The link is only used when the button is pressed:
 * mail programs often open links on their own to scan them, which would otherwise spend a one-time link.
 */
export function RedeemLink({ token, isNew }: { token?: string; isNew: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "expired" | "error">(token ? "idle" : "expired");

  const go = async () => {
    setState("busy");
    try {
      const r = await fetch("/api/auth/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (r.status === 400) return setState("expired");
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { id: string; name: string };
      startAccountSession(j.id, j.name);
      // /app is the original static app, outside the Next router: do a full navigation.
      window.location.assign("/app");
    } catch {
      setState("error");
    }
  };

  if (state === "expired")
    return (
      <AuthShell>
        <h1>Linket virker ikke længere</h1>
        <p className="bx-guide-lead">
          Linket er enten brugt eller udløbet. Skriv din e-mail på login-siden, så sender vi dig et nyt.
        </p>
        <Link href="/login" className="bx-btn bx-btn-primary bx-btn-lg">
          Få et nyt link
        </Link>
      </AuthShell>
    );

  return (
    <AuthShell>
      <h1>{isNew ? "Bekræft din e-mail" : "Log ind"}</h1>
      <p className="bx-guide-lead">
        {isNew
          ? "Tryk på knappen for at bekræfte din e-mail. Så er din konto klar, og du kommer videre til dit budget."
          : "Tryk på knappen for at logge ind og komme videre til dit budget."}
      </p>
      {state === "error" ? (
        <p className="bx-error" role="alert" style={{ marginBottom: 12 }}>
          Det lykkedes ikke lige nu. Prøv igen om lidt.
        </p>
      ) : null}
      <button
        type="button"
        className="bx-btn bx-btn-primary bx-btn-lg"
        style={{ width: "100%" }}
        disabled={state === "busy"}
        onClick={go}
      >
        {state === "busy" ? "Et øjeblik …" : isNew ? "Bekræft og fortsæt" : "Log ind"}
      </button>
    </AuthShell>
  );
}
