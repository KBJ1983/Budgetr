import { cookies } from "next/headers";
import { TEACHER_COOKIE } from "@/lib/session";
import { LIFETIMES, MAX_PUPILS, TRIN } from "@/lib/skole";
import { currentTeacher } from "@/lib/skole-auth";
import { teacherSeat } from "@/lib/skole-seats";
import { createClass, teacherClasses } from "@/lib/skole-store";

// budgetpro Skole: the logged-in teacher's classes. GET lists them; POST { trin, antal, days } makes one – only with a
// seat from a school's agreement (lib/skole-seats.ts), else 403.
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  if (!t) return new Response(null, { status: 401, headers: noStore });
  return Response.json(await teacherClasses(t.id), { headers: noStore });
}

export async function POST(req: Request) {
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  if (!t) return new Response(null, { status: 401, headers: noStore });
  if (!(await teacherSeat(t))) return Response.json({ error: "seat" }, { status: 403, headers: noStore });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const trin = Number(b.trin);
  const antal = Number(b.antal);
  const days = Number(b.days);
  if (!TRIN.includes(trin) || !LIFETIMES.includes(days) || !Number.isInteger(antal) || antal < 1 || antal > MAX_PUPILS) {
    return Response.json({ error: "input" }, { status: 400, headers: noStore });
  }
  const cls = await createClass({ trin, count: antal, days, teacherId: t.id });
  return Response.json({ id: cls.id }, { status: 201, headers: noStore });
}
