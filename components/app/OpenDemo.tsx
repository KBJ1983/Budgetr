"use client";

import { useEffect, useState } from "react";
import { AuthShell } from "@/components/app/AuthShell";
import { login } from "@/lib/store";

const KEY = "budgetr-app:demo";

/** /demobruger: resets the demo budget, logs in as the demo customer and opens the app. */
export function OpenDemo() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const r = await fetch("/api/demo", { method: "POST", cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
      } catch {
        if (!gone) setFailed(true);
        return;
      }
      // Drop this browser's copy (and an open draft), so the app loads the fresh demo from the server.
      try {
        for (const k of Object.keys(localStorage)) if (k === KEY || k.startsWith(KEY + ":")) localStorage.removeItem(k);
        sessionStorage.removeItem(KEY + ":draft");
        sessionStorage.removeItem("budgetr:quiet");
      } catch {}
      login("DEMO");
      window.location.replace("/app");
    })();
    return () => {
      gone = true;
    };
  }, []);

  return (
    <AuthShell>
      <h1>Demo</h1>
      {failed ? (
        <p className="bx-guide-lead" role="alert">
          Demoen kunne ikke åbnes lige nu. Prøv igen om lidt.
        </p>
      ) : (
        <p className="bx-guide-lead">Vi gør demo-budgettet klar. Det tager et øjeblik.</p>
      )}
    </AuthShell>
  );
}
