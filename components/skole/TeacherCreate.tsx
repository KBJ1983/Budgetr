"use client";

import { useState } from "react";
import { CLASS_DAYS, MAX_PUPILS, TRIN } from "@/lib/skole";
import { pupilAddress, skoleBase } from "@/lib/skole-host";
import { Shell } from "./Shell";
import s from "./skole.module.css";
import { useToast } from "./useToast";

interface Made {
  token: string;
  trin: number;
  codes: string[];
}

export function TeacherCreate() {
  const [trin, setTrin] = useState(8);
  const [antal, setAntal] = useState(24);
  const [made, setMade] = useState<Made | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/skole/klasse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trin, antal }) });
      if (!r.ok) throw new Error(String(r.status));
      setMade((await r.json()) as Made);
    } catch {
      setErr("Klassen kunne ikke oprettes. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(done);
    } catch {
      showToast("Kunne ikke kopiere. Markér teksten, og kopiér den selv.");
    }
  };

  // On the subdomain the addresses have no /skole (lib/skole-host.ts). `made` is only set in the browser.
  const overviewPath = made ? `${skoleBase(window.location.host)}/klasse/${made.token}` : "";
  const link = made ? `${window.location.origin}${overviewPath}` : "";
  const address = made ? pupilAddress(window.location.host) : "";

  return (
    <Shell right={<span className={s.teacherPill}>Lærer</span>} toast={toast}>
      <div className={`${s.wrap} ${s.wrapNarrow}`}>
        <h1 className={`${s.q} ${s.noPrint}`}>Opret klasse</h1>

        {!made && (
          <>
            <div className={`${s.card} ${s.createRow}`}>
              <div className={s.field}>
                <span className={s.label} id="trin-label">
                  Klassetrin
                </span>
                <div className={s.trinRow} role="group" aria-labelledby="trin-label">
                  {TRIN.map((t) => (
                    <button key={t} type="button" className={s.trinBtn} aria-pressed={trin === t} onClick={() => setTrin(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.field}>
                <span className={s.label}>Antal elever</span>
                <div className={s.stepper}>
                  <button type="button" aria-label="Færre elever" onClick={() => setAntal((a) => Math.max(1, a - 1))}>
                    −
                  </button>
                  <span aria-live="polite">{antal}</span>
                  <button type="button" aria-label="Flere elever" onClick={() => setAntal((a) => Math.min(MAX_PUPILS, a + 1))}>
                    +
                  </button>
                </div>
              </div>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={() => void create()}>
                Lav elevkoder
              </button>
            </div>
            <p className={s.info}>budgetpro gemmer ingen navne. Skriv selv, hvem der har hvilken kode.</p>
            {err && (
              <span className={s.err} role="alert">
                {err}
              </span>
            )}
          </>
        )}

        {made && (
          <>
            <div className={`${s.card} ${s.noPrint}`}>
              <span className={s.cardTitle}>Dit lærerlink</span>
              <p className={s.warn}>Linket er den eneste vej tilbage til klassen. Gem det, fx som bogmærke eller i en mail til dig selv. Del det ikke med eleverne.</p>
              <div className={s.linkBox}>
                <input className={s.input} readOnly value={link} aria-label="Lærerlink" onFocus={(e) => e.target.select()} />
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => void copy(link, "Linket er kopieret.")}>
                  Kopiér link
                </button>
                <a className={`${s.btn} ${s.btnSmall} ${s.btnPrimary}`} href={overviewPath}>
                  Gå til klasseoverblik
                </a>
              </div>
            </div>

            <div className={s.stack}>
              <div className={`${s.codesHead} ${s.noPrint}`}>
                <h2 className={s.h2}>
                  {made.codes.length} elevkoder · {made.trin}. klasse
                </h2>
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => void copy(made.codes.join("\n"), `${made.codes.length} koder kopieret.`)}>
                  Kopiér
                </button>
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => window.print()}>
                  Print
                </button>
              </div>
              <div className={s.printOnly}>
                <h1 className={s.h2}>budgetpro Skole · {made.trin}. klasse</h1>
                <p className={s.note}>Gå ind på {address}, og skriv din kode. Klip langs de stiplede linjer.</p>
              </div>
              <div className={s.codes}>
                {made.codes.map((code, i) => (
                  <div key={code} className={s.codeCell}>
                    <span className={s.codeNo}>{i + 1}</span>
                    <span className={s.codeText} data-code>
                      {code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className={`${s.info} ${s.noPrint}`}>Koderne og elevernes valg slettes automatisk efter {CLASS_DAYS} dage.</p>
          </>
        )}
      </div>
    </Shell>
  );
}
