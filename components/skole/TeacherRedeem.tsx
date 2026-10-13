"use client";

import { useState } from "react";
import { skoleBase } from "@/lib/skole-host";
import { Shell } from "./Shell";
import s from "./skole.module.css";

/** Opened from the login mail. The link is only used on the button press, so mail scanners can't spend it. */
export function TeacherRedeem({ token }: { token?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "bad">(token ? "idle" : "bad");

  const go = async () => {
    setState("busy");
    try {
      const r = await fetch("/api/skole/auth/indlos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!r.ok) return setState("bad");
      window.location.href = `${skoleBase(window.location.host)}/laerer`;
    } catch {
      setState("bad");
    }
  };

  return (
    <Shell right={<span className={s.teacherPill}>Lærer</span>}>
      <div className={s.start}>
        <div className={s.startBox}>
          {state === "bad" ? (
            <>
              <h1 className={s.q}>Linket virker ikke</h1>
              <p className={s.lead}>Linket er brugt, udløbet eller ikke kopieret helt. Bed om en ny kode på lærersiden.</p>
              <a className={`${s.btn} ${s.btnPrimary}`} href="/skole/laerer">
                Til lærersiden
              </a>
            </>
          ) : (
            <>
              <h1 className={s.q}>Log ind som lærer</h1>
              <p className={s.lead}>Tryk på knappen for at logge ind på budgetpro Skole på denne enhed.</p>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={state === "busy"} onClick={() => void go()}>
                Log ind
              </button>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
