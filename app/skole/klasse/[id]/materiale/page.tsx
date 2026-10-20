import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Material } from "@/components/skole/Material";
import { Shell } from "@/components/skole/Shell";
import s from "@/components/skole/skole.module.css";
import { TEACHER_COOKIE } from "@/lib/session";
import { currentTeacher } from "@/lib/skole-auth";
import { DEMO_CLASS_ID, demoClass } from "@/lib/skole-demo";
import { classExpires, readClassFor } from "@/lib/skole-store";

export const metadata: Metadata = { title: "budgetpro Skole – undervisningsmateriale", robots: { index: false } };

// The teaching material with the class's pupil codes on the worksheets. Only the class's own teacher (or the demo class).
export default async function ClassMaterialPage({ params }: PageProps<"/skole/klasse/[id]/materiale">) {
  const { id } = await params;
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  if (id === DEMO_CLASS_ID) {
    const v = demoClass().view;
    return <Material teacher={t?.name ?? null} cls={{ id: v.id, trin: v.trin, codes: v.codes, expires: v.expires }} />;
  }
  const cls = t ? await readClassFor(t.id, id) : null;
  if (!t || !cls) {
    return (
      <Shell right={<span className={s.teacherPill}>{t ? t.name : "Lærer"}</span>}>
        <div className={`${s.wrap} ${s.wrapNarrow}`}>
          <div className={s.card}>
            <span className={s.cardTitle}>{t ? "Klassen findes ikke" : "Log ind for at se klassen"}</span>
            <span className={s.note}>
              {t ? "Klassen er udløbet eller slettet, eller den hører til en anden lærer." : "Elevkoderne kan kun ses af den lærer, der har oprettet klassen."}
            </span>
            <Link className={`${s.btn} ${s.btnPrimary}`} href="/skole/materiale" style={{ alignSelf: "flex-start" }}>
              Se materialet uden koder
            </Link>
          </div>
        </div>
      </Shell>
    );
  }
  return <Material teacher={t.name} cls={{ id: cls.id, trin: cls.trin, codes: cls.codes, expires: classExpires(cls).toISOString() }} />;
}
