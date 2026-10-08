import type { Metadata } from "next";
import Link from "next/link";
import { ClassOverview } from "@/components/skole/ClassOverview";
import { Shell } from "@/components/skole/Shell";
import s from "@/components/skole/skole.module.css";
import { CLASS_DAYS } from "@/lib/skole";
import { classOverview, readClass } from "@/lib/skole-store";

export const metadata: Metadata = {
  title: "budgetpro Skole – klasseoverblik",
  robots: { index: false },
  // The secret is in the URL: don't send it on to other sites.
  referrer: "no-referrer",
};

export default async function ClassPage({ params }: PageProps<"/skole/klasse/[token]">) {
  const { token } = await params;
  const cls = await readClass(token.slice(0, 100));
  if (!cls) {
    return (
      <Shell right={<span className={s.teacherPill}>Lærer</span>}>
        <div className={`${s.wrap} ${s.wrapNarrow}`}>
          <div className={s.card}>
            <span className={s.cardTitle}>Linket virker ikke</span>
            <span className={s.note}>Klassen findes ikke længere, eller linket er ikke kopieret helt. En klasse slettes {CLASS_DAYS} dage efter, at den er oprettet.</span>
            <Link className={`${s.btn} ${s.btnPrimary}`} href="/skole/laerer" style={{ alignSelf: "flex-start" }}>
              Opret en ny klasse
            </Link>
          </div>
        </div>
      </Shell>
    );
  }
  return <ClassOverview token={token} initial={await classOverview(cls)} />;
}
