"use client";

import { useEffect, useState } from "react";
import { dayMonthYear } from "@/lib/skole";
import { pupilAddress } from "@/lib/skole-host";
import s from "./skole.module.css";

/**
 * A class's pupil codes with Kopiér and Print. The printout is slips to cut out, each with the code and its expiry
 * date, under the address the pupils go to.
 */
export function CodeSheet({ trin, codes, expires, onCopied }: { trin: number; codes: string[]; expires: string; onCopied: (msg: string) => void }) {
  const until = dayMonthYear(new Date(expires));
  // Read in an effect so the server render and the first browser render match.
  const [address, setAddress] = useState("");
  useEffect(() => setAddress(pupilAddress(window.location.host)), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      onCopied(`${codes.length} koder kopieret.`);
    } catch {
      onCopied("Kunne ikke kopiere. Markér koderne, og kopiér dem selv.");
    }
  };

  return (
    <section className={s.stack} aria-label="Elevkoder">
      <div className={`${s.codesHead} ${s.noPrint}`}>
        <h2 className={s.h2}>
          {codes.length} elevkoder · {trin}. klasse
        </h2>
        <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => void copy()}>
          Kopiér
        </button>
        <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => window.print()}>
          Print
        </button>
      </div>
      <div className={s.printOnly}>
        <h1 className={s.h2}>budgetpro Skole · {trin}. klasse</h1>
        <p className={s.note}>
          Gå ind på {address}, og skriv din kode. Koden virker til den {until}. Klip langs de stiplede linjer.
        </p>
      </div>
      <div className={s.codes}>
        {codes.map((code, i) => (
          <div key={code} className={s.codeCell}>
            <span className={s.codeNo}>{i + 1}</span>
            <span className={s.codeText} data-code>
              {code}
            </span>
            <span className={`${s.codeUntil} ${s.printOnly}`}>til {until}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
