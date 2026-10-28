import { cookies } from "next/headers";
import { TEACHER_COOKIE } from "@/lib/session";
import { currentTeacher } from "@/lib/skole-auth";
import { classOverview, deleteClass, readClassFor, renameClass } from "@/lib/skole-store";

// One of the logged-in teacher's classes (budgetpro Skole): GET the overview, PATCH { name } to name it ("" takes the
// name off), DELETE the class with its codes and the pupils' work. Someone else's class answers 404, like an unknown one.
const noStore = { "Cache-Control": "no-store" };

async function own(ctx: RouteContext<"/api/skole/klasse/[id]">) {
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  return t ? readClassFor(t.id, (await ctx.params).id) : null;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/skole/klasse/[id]">) {
  const cls = await own(ctx);
  if (!cls) return new Response(null, { status: 404, headers: noStore });
  return Response.json(await classOverview(cls), { headers: noStore });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/skole/klasse/[id]">) {
  const cls = await own(ctx);
  if (!cls) return new Response(null, { status: 404, headers: noStore });
  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  return Response.json(await classOverview(await renameClass(cls, body?.name ?? "")), { headers: noStore });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/skole/klasse/[id]">) {
  const cls = await own(ctx);
  if (!cls) return new Response(null, { status: 404, headers: noStore });
  await deleteClass(cls);
  return new Response(null, { status: 204, headers: noStore });
}
