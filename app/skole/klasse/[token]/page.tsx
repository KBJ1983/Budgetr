import type { Metadata } from "next";
import Link from "next/link";
import { ClassOverview } from "@/components/skole/ClassOverview";
import { Shell } from "@/components/skole/Shell";
import s from "@/components/skole/skole.module.css";
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
            <span className={s.note}>
              Klassen er udløbet eller slettet, linket er ikke kopieret helt, eller du har fået et nyt link på mail siden. Har du mistet linket, kan du få et nyt på mail.
            </span>
            <div className={s.actions}>
              <Link className={`${s.btn} ${s.btnPrimary}`} href="/skole/laerer#mistet">
                Få et nyt link
              </Link>
              <Link className={s.btn} href="/skole/laerer">
                Opret en ny klasse
              </Link>
            </div>
          </div>
        </div>
      </Shell>
    );
  }
  return <ClassOverview token={token} initial={await classOverview(cls)} />;
}
