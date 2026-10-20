"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { SkoleLogo } from "@/components/Logo";
import { dayMonthYear } from "@/lib/skole";
import { pupilAddress } from "@/lib/skole-host";
import { COURSE, LESSONS, type Lesson, type Task } from "@/lib/skole-materiale";
import m from "./material.module.css";
import { Shell } from "./Shell";
import s from "./skole.module.css";

type Part = "forloeb" | "vejledning" | `elev${number}`;

const PARTS: { key: Part; label: string; pages: string }[] = [
  { key: "forloeb", label: "Forløbsbeskrivelse", pages: "2 sider" },
  { key: "vejledning", label: "Lærervejledning til de fire lektioner", pages: "4 sider" },
  ...LESSONS.map((l) => ({ key: `elev${l.n}` as Part, label: `Elevark, lektion ${l.n}: ${l.title}`, pages: "1 side pr. elev" })),
];

/**
 * The teaching material for the four lessons as A4 sheets to print: the course description, a teacher's page per
 * lesson and a worksheet per lesson. With a class (`codes`), the worksheets come one per pupil with the code printed on
 * it; without, one blank sheet to copy. Content in lib/skole-materiale.ts.
 */
export function Material({ teacher, cls }: { teacher: string | null; cls?: { id: string; trin: number; codes: string[]; expires: string } }) {
  const [parts, setParts] = useState<Set<Part>>(() => new Set(cls ? ["elev1"] : ["forloeb"]));
  const [withCodes, setWithCodes] = useState(!!cls);
  // Read in an effect so the server render and the first browser render match.
  const [address, setAddress] = useState("");
  useEffect(() => setAddress(pupilAddress(window.location.host)), []);

  const toggle = (p: Part) =>
    setParts((x) => {
      const n = new Set(x);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const codes: (string | null)[] = cls && withCodes ? cls.codes : [null];
  const until = cls ? dayMonthYear(new Date(cls.expires)) : null;
  const sheets: { key: string; node: React.ReactNode }[] = [];
  if (parts.has("forloeb")) sheets.push({ key: "f1", node: <CourseOne /> }, { key: "f2", node: <CourseTwo /> });
  if (parts.has("vejledning")) for (const l of LESSONS) sheets.push({ key: `v${l.n}`, node: <TeacherSheet l={l} /> });
  for (const l of LESSONS) {
    if (!parts.has(`elev${l.n}`)) continue;
    for (const code of codes) sheets.push({ key: `e${l.n}-${code ?? ""}`, node: <PupilSheet l={l} code={code} address={address} until={code ? until : null} /> });
  }

  const back = cls ? { href: `/skole/klasse/${cls.id}`, label: "← Klasseoverblik" } : teacher ? { href: "/skole/laerer", label: "← Mine klasser" } : { href: "/skole", label: "← budgetpro Skole" };

  return (
    <Shell right={teacher ? <span className={s.teacherPill}>{teacher}</span> : undefined}>
      <div className={`${s.wrap} ${s.noPrint}`}>
        <Link className={s.small} href={back.href}>
          {back.label}
        </Link>
        <div className={s.titleBlock}>
          <h1 className={s.q}>Undervisningsmateriale</h1>
          <span className={s.note}>
            Forløbet „{COURSE.title}“ er {COURSE.sub.toLowerCase()}. Vælg, hvad du vil printe. Arkene er i A4.
          </span>
        </div>
        <div className={`${s.card} ${m.pick}`}>
          <span className={s.cardTitle}>Hvad vil du printe?</span>
          {PARTS.map((p) => (
            <label key={p.key} className={m.pickRow}>
              <input type="checkbox" checked={parts.has(p.key)} onChange={() => toggle(p.key)} />
              <span>{p.label}</span>
              <span className={s.small}>{p.key.startsWith("elev") && !(cls && withCodes) ? "1 side" : p.pages}</span>
            </label>
          ))}
          {cls ? (
            <div className={m.codeChoice} role="radiogroup" aria-label="Elevkoder på elevarkene">
              <span className={s.label}>Elevarkene</span>
              <label className={m.pickRow}>
                <input type="radio" name="codes" checked={withCodes} onChange={() => setWithCodes(true)} />
                <span>
                  Ét ark pr. elev med elevkoden på ({cls.codes.length} elever, {cls.trin}. klasse)
                </span>
              </label>
              <label className={m.pickRow}>
                <input type="radio" name="codes" checked={!withCodes} onChange={() => setWithCodes(false)} />
                <span>Ét ark uden kode, som du selv kopierer</span>
              </label>
            </div>
          ) : (
            <span className={s.small}>
              Elevarkene kan printes med hver elevs kode på. Åbn klassen under Mine klasser, og vælg Undervisningsmateriale der.
            </span>
          )}
          <div className={m.printRow}>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={!sheets.length} onClick={() => window.print()}>
              Print
            </button>
            <span className={s.note}>{sheets.length === 1 ? "1 side" : `${sheets.length} sider`}</span>
          </div>
        </div>
        {sheets.length > 0 && <span className={s.small}>Sådan ser siderne ud:</span>}
      </div>
      <div className={m.sheets}>
        {sheets.map((x) => (
          <Fragment key={x.key}>{x.node}</Fragment>
        ))}
      </div>
    </Shell>
  );
}

// ---- The sheets --------------------------------------------------------------------------------------------------

function Sheet({ tag, foot, children }: { tag: string; foot: string; children: React.ReactNode }) {
  return (
    <article className={m.sheet}>
      <header className={m.head}>
        <SkoleLogo fontSize={15} bg="#fff" />
        <span className={m.tag}>{tag}</span>
      </header>
      <div className={m.body}>{children}</div>
      <footer className={m.foot}>
        <span>{foot}</span>
        <span>budgetpro Skole · eksempeltal</span>
      </footer>
    </article>
  );
}

function CourseOne() {
  const facts = [
    { l: "Målgruppe", v: COURSE.audience },
    { l: "Fag", v: COURSE.subjects },
    { l: "Omfang", v: COURSE.time },
    { l: "Udstyr", v: COURSE.devices },
  ];
  return (
    <Sheet tag="Forløbsbeskrivelse" foot="Forløbsbeskrivelse · side 1 af 2">
      <div className={m.titleBlock}>
        <span className={m.kicker}>{COURSE.sub}</span>
        <h2 className={m.h1}>{COURSE.title}</h2>
      </div>
      <dl className={m.facts}>
        {facts.map((f) => (
          <div key={f.l}>
            <dt>{f.l}</dt>
            <dd>{f.v}</dd>
          </div>
        ))}
      </dl>
      <section>
        <h3 className={m.h3}>Formål</h3>
        <p className={m.p}>{COURSE.purpose}</p>
      </section>
      <section>
        <h3 className={m.h3}>Eleverne lærer at</h3>
        <ul className={m.list}>
          {COURSE.goals.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className={m.h3}>Forløbet i overblik</h3>
        <div className={m.lessons}>
          {LESSONS.map((l) => (
            <div key={l.n} className={m.lesson} data-tone={l.n === 4 ? "dark" : l.n === 2 ? "sun" : undefined}>
              <span className={m.lessonNo}>
                Lektion {l.n} · {l.steps}
              </span>
              <b>{l.title}</b>
              <span>{l.lead}</span>
              <span className={m.terms}>{l.terms.join(" · ")}</span>
            </div>
          ))}
        </div>
      </section>
    </Sheet>
  );
}

function CourseTwo() {
  const blocks = [
    { t: "Før forløbet", xs: COURSE.before },
    { t: "Undervejs", xs: COURSE.during },
    { t: "Evaluering", xs: COURSE.evaluation },
    { t: "Differentiering", xs: COURSE.differentiation },
  ];
  return (
    <Sheet tag="Forløbsbeskrivelse" foot="Forløbsbeskrivelse · side 2 af 2">
      <section>
        <h3 className={m.h3}>De tre fremtidspersoner</h3>
        <ul className={m.list}>
          {COURSE.people.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
      <div className={m.twoCols}>
        {blocks.map((b) => (
          <section key={b.t}>
            <h3 className={m.h3}>{b.t}</h3>
            <ul className={m.list}>
              {b.xs.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section>
        <h3 className={m.h3}>Fagbegreber</h3>
        <dl className={m.glossary}>
          {COURSE.glossary.map((g) => (
            <div key={g.t}>
              <dt>{g.t}</dt>
              <dd>{g.d}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className={m.box}>
        <h3 className={m.h3}>Data og privatliv</h3>
        <p className={m.p}>{COURSE.privacy}</p>
      </section>
    </Sheet>
  );
}

function TeacherSheet({ l }: { l: Lesson }) {
  return (
    <Sheet tag={`Lærervejledning · ${l.steps}`} foot={`Lærervejledning · lektion ${l.n} af ${LESSONS.length}`}>
      <div className={m.titleBlock}>
        <span className={m.kicker}>Lektion {l.n}</span>
        <h2 className={m.h1}>{l.title}</h2>
        <p className={m.p}>{l.lead}</p>
      </div>
      <div className={m.twoCols}>
        <section>
          <h3 className={m.h3}>Mål</h3>
          <ul className={m.list}>
            {l.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className={m.h3}>Forberedelse</h3>
          <ul className={m.list}>
            {l.prep.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <h3 className={m.h3}>Fagbegreber</h3>
          <p className={m.p}>{l.terms.join(" · ")}</p>
        </section>
      </div>
      <section>
        <h3 className={m.h3}>Lektionen trin for trin</h3>
        <div className={m.plan}>
          {l.plan.map((p) => (
            <div key={p.min}>
              <span className={m.min}>{p.min} min.</span>
              <b>{p.title}</b>
              <span>{p.text}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className={m.h3}>Til samtalen</h3>
        <ul className={m.list}>
          {l.talk.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className={m.h3}>Tal til tavlen: {l.key.title.toLowerCase()}</h3>
        <table className={m.key}>
          <thead>
            <tr>
              {l.key.cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {l.key.rows.map((r) => (
              <tr key={r[0]}>
                {r.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {l.key.note && <p className={m.small}>{l.key.note}</p>}
      </section>
    </Sheet>
  );
}

function PupilSheet({ l, code, address, until }: { l: Lesson; code: string | null; address: string; until: string | null }) {
  return (
    <Sheet tag={`Elevark · ${l.steps}`} foot={`Elevark · lektion ${l.n} af ${LESSONS.length}`}>
      <div className={m.pupilTop}>
        <div className={m.titleBlock}>
          <span className={m.kicker}>Lektion {l.n}</span>
          <h2 className={m.h1}>{l.title}</h2>
        </div>
        <div className={m.codeBox}>
          <span>Elevkode</span>
          {code ? <b data-code>{code}</b> : <span className={m.codeBlank} />}
        </div>
      </div>
      <p className={m.p}>
        Gå ind på <b>{address || "skole.budgetpro.dk/elev"}</b>, og skriv din kode.{until ? ` Koden virker til den ${until}.` : ""} {l.sheet.intro}
      </p>
      <ol className={m.tasks}>
        {l.sheet.tasks.map((t, i) => (
          <li key={i}>
            <TaskView t={t} />
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

function Lines({ n }: { n: number }) {
  return (
    <div className={m.lines}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

function TaskView({ t }: { t: Task }) {
  const head = (
    <>
      <b className={m.q}>{t.q}</b>
      {t.hint && <span className={m.hint}>{t.hint}</span>}
    </>
  );
  switch (t.kind) {
    case "fields":
      return (
        <>
          {head}
          <div className={m.fields} data-many={t.fields.length > 3 || undefined}>
            {t.fields.map((f) => (
              <div key={f.label} className={m.field}>
                <span>{f.label}</span>
                <span className={m.blank} />
                {f.unit && <span className={m.unit}>{f.unit}</span>}
              </div>
            ))}
          </div>
        </>
      );
    case "choice":
      return (
        <>
          {head}
          <div className={m.options}>
            {t.options.map((o) => (
              <span key={o}>
                <i className={m.tick} />
                {o}
              </span>
            ))}
          </div>
          {t.follow && <span className={m.follow}>{t.follow}</span>}
          {t.lines ? <Lines n={t.lines} /> : null}
        </>
      );
    case "lines":
      return (
        <>
          {head}
          <Lines n={t.lines} />
        </>
      );
    case "table":
      return (
        <>
          {head}
          <table className={m.grid}>
            <thead>
              <tr>
                <th />
                {t.cols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r) => (
                <tr key={r}>
                  <td>{r}</td>
                  {t.cols.map((c) => (
                    <td key={c} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    case "sort":
      return (
        <>
          {head}
          <div className={m.chips}>
            {t.items.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <div className={m.sortCols}>
            {t.cols.map((c) => (
              <div key={c}>
                <b>{c}</b>
                <Lines n={Math.ceil(t.items.length / 2)} />
              </div>
            ))}
          </div>
        </>
      );
  }
}
