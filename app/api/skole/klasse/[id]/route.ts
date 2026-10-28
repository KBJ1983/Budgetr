import { cookies } from "next/headers";
import { TEACHER_COOKIE } from "@/lib/session";
import { currentTeacher } from "@/lib/skole-auth";
import { teacherSeat } from "@/lib/skole-seats";
import { classOverview, deleteClass, extendClass, readClassFor, renameClass, setOpenTo } from "@/lib/skole-store";

// One of the logged-in teacher's classes (budgetpro Skole): GET the overview, PATCH { name } to name it ("" takes the
// name off), { openTo } to open the steps lesson by lesson (null = all), or { extend: true } to give it EXTEND_DAYS more (needs a seat – the free class can't be extended; 409 at
// MAX_CLASS_DAYS), DELETE the class with its codes and the pupils' work. Someone else's class answers 404, like an unknown one.
const noStore = { "Cache-Control": "no-store" };

async function own(ctx: RouteContext<"/api/skole/klasse/[id]">) {
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  const cls = t ? await readClassFor(t.id, (await ctx.params).id) : null;
  return t && cls ? { t, cls } : null;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/skole/klasse/[id]">) {
  const o = await own(ctx);
  if (!o) return new Response(null, { status: 404, headers: noStore });
  return Response.json(await classOverview(o.cls), { headers: noStore });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/skole/klasse/[id]">) {
  const o = await own(ctx);
  if (!o) return new Response(null, { status: 404, headers: noStore });
  let body: { name?: unknown; extend?: unknown; openTo?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if ("openTo" in (body ?? {})) return Response.json(await classOverview(await setOpenTo(o.cls, body.openTo)), { headers: noStore });
  if (body?.extend === true) {
    if (!(await teacherSeat(o.t))) return Response.json({ error: "seat" }, { status: 403, headers: noStore });
    const next = await extendClass(o.cls);
    if (!next) return Response.json({ error: "max" }, { status: 409, headers: noStore });
    return Response.json(await classOverview(next), { headers: noStore });
  }
  return Response.json(await classOverview(await renameClass(o.cls, body?.name ?? "")), { headers: noStore });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/skole/klasse/[id]">) {
  const o = await own(ctx);
  if (!o) return new Response(null, { status: 404, headers: noStore });
  await deleteClass(o.cls);
  return new Response(null, { status: 204, headers: noStore });
}
