import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ClassOverview } from "@/components/skole/ClassOverview";
import { Shell } from "@/components/skole/Shell";
import s from "@/components/skole/skole.module.css";
import { TEACHER_COOKIE } from "@/lib/session";
import { currentTeacher } from "@/lib/skole-auth";
import { classOverview, readClassFor } from "@/lib/skole-store";

export const metadata: Metadata = { title: "budgetpro Skole – klasseoverblik", robots: { index: false } };

// One of the logged-in teacher's classes. Not logged in, or not their class: a short note instead.
export default async function ClassPage({ params }: PageProps<"/skole/klasse/[id]">) {
  const { id } = await params;
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  const cls = t ? await readClassFor(t.id, id) : null;
  if (!t || !cls) {
    return (
      <Shell right={<span className={s.teacherPill}>{t ? t.name : "Lærer"}</span>}>
        <div className={`${s.wrap} ${s.wrapNarrow}`}>
          <div className={s.card}>
            <span className={s.cardTitle}>{t ? "Klassen findes ikke" : "Log ind for at se klassen"}</span>
            <span className={s.note}>
              {t ? "Klassen er udløbet eller slettet, eller den hører til en anden lærer." : "Klasser kan kun ses af den lærer, der har oprettet dem."}
            </span>
            <Link className={`${s.btn} ${s.btnPrimary}`} href="/skole/laerer" style={{ alignSelf: "flex-start" }}>
              {t ? "Til mine klasser" : "Log ind"}
            </Link>
          </div>
        </div>
      </Shell>
    );
  }
  return <ClassOverview teacher={t.name} initial={await classOverview(cls)} />;
}
