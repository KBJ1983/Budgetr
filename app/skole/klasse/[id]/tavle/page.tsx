import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Board } from "@/components/skole/Board";
import { TEACHER_COOKIE } from "@/lib/session";
import { currentTeacher } from "@/lib/skole-auth";
import { DEMO_CLASS_ID, demoClass } from "@/lib/skole-demo";
import { classOverview, readClassFor } from "@/lib/skole-store";

export const metadata: Metadata = { title: "budgetpro Skole – tavle", robots: { index: false } };

// The board for the projector (components/skole/Board.tsx). Only the class's own teacher, or the demo class; anyone
// else goes to the class page, which says why.
export default async function BoardPage({ params }: PageProps<"/skole/klasse/[id]/tavle">) {
  const { id } = await params;
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  if (id === DEMO_CLASS_ID) return <Board teacher={t ? t.name : "Lærer"} initial={demoClass().view} demo />;
  const cls = t ? await readClassFor(t.id, id) : null;
  if (!t || !cls) redirect(`/skole/klasse/${id}`);
  return <Board teacher={t.name} initial={await classOverview(cls)} />;
}
