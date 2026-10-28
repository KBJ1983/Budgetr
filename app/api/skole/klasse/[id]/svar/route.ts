import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { TEACHER_COOKIE } from "@/lib/session";
import { STEP_COUNT } from "@/lib/skole";
import { currentTeacher } from "@/lib/skole-auth";
import { DEMO_CLASS_ID, demoAnswers } from "@/lib/skole-demo";
import { classAnswers, readClassFor } from "@/lib/skole-store";

// The board (/skole/klasse/<id>/tavle): GET ?trin=2–8 gives every pupil's answer to that step's reflection question –
// without codes, in random order (lib/skole-store.ts classAnswers). Only the class's own teacher; the demo class
// answers with its made-up pupils.
const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest, ctx: RouteContext<"/api/skole/klasse/[id]/svar">) {
  const { id } = await ctx.params;
  const step = Number(req.nextUrl.searchParams.get("trin"));
  if (!Number.isInteger(step) || step < 2 || step > STEP_COUNT) return new Response(null, { status: 400, headers: noStore });
  if (id === DEMO_CLASS_ID) return Response.json({ answers: demoAnswers(step) }, { headers: noStore });
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  const cls = t ? await readClassFor(t.id, id) : null;
  if (!cls) return new Response(null, { status: 404, headers: noStore });
  return Response.json({ answers: await classAnswers(cls, step) }, { headers: noStore });
}
