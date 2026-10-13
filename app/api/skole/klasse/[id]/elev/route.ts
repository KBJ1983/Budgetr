import { cookies } from "next/headers";
import { TEACHER_COOKIE } from "@/lib/session";
import { normalizeCode } from "@/lib/skole";
import { currentTeacher } from "@/lib/skole-auth";
import { classPupil, readClassFor } from "@/lib/skole-store";

// One pupil of the logged-in teacher's class (budgetpro Skole): GET ?kode=<code> → the choices in words and the answers.
const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request, ctx: RouteContext<"/api/skole/klasse/[id]/elev">) {
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  const cls = t ? await readClassFor(t.id, (await ctx.params).id) : null;
  const pupil = cls ? await classPupil(cls, normalizeCode(new URL(req.url).searchParams.get("kode") ?? "")) : null;
  if (!pupil) return new Response(null, { status: 404, headers: noStore });
  return Response.json(pupil, { headers: noStore });
}
