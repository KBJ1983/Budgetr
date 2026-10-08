import { normalizeCode } from "@/lib/skole";
import { classPupil, readClass } from "@/lib/skole-store";

// One pupil of the teacher's class (budgetpro Skole): GET ?kode=<code> → the choices in words and the answers.
const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request, ctx: RouteContext<"/api/skole/klasse/[token]/elev">) {
  const cls = await readClass((await ctx.params).token);
  const code = normalizeCode(new URL(req.url).searchParams.get("kode") ?? "");
  const pupil = cls ? await classPupil(cls, code) : null;
  if (!pupil) return new Response(null, { status: 404, headers: noStore });
  return Response.json(pupil, { headers: noStore });
}
