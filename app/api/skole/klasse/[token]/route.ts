import { classOverview, deleteClass, readClass } from "@/lib/skole-store";

// The teacher's class (budgetpro Skole): GET the overview, DELETE the class with its codes and the pupils' choices.
const noStore = { "Cache-Control": "no-store" };

export async function GET(_req: Request, ctx: RouteContext<"/api/skole/klasse/[token]">) {
  const cls = await readClass((await ctx.params).token);
  if (!cls) return new Response(null, { status: 404, headers: noStore });
  return Response.json(await classOverview(cls), { headers: noStore });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/skole/klasse/[token]">) {
  const cls = await readClass((await ctx.params).token);
  if (!cls) return new Response(null, { status: 404, headers: noStore });
  await deleteClass(cls);
  return new Response(null, { status: 204, headers: noStore });
}
