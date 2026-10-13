import { cookies } from "next/headers";
import { mailSeatRequest } from "@/lib/agreement-auth";
import { TEACHER_COOKIE } from "@/lib/session";
import { currentTeacher } from "@/lib/skole-auth";
import { isSkoleHost, requestOrigin } from "@/lib/skole-host";
import { requestSeat, takeSeat } from "@/lib/skole-seats";

// budgetpro Skole: the logged-in teacher gets a seat from a school's agreement (lib/skole-seats.ts).
//   { kode }    take the seat behind the code from the seat mail
//   { skole }   ask that school's kundeadmins for a seat (exact name of a school with an agreement)
const noStore = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  if (!t) return new Response(null, { status: 401, headers: noStore });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (body.kode !== undefined) {
    const r = await takeSeat(t, body.kode);
    return r.ok ? Response.json({ seat: r.seat }, { headers: noStore }) : Response.json({ error: r.error }, { status: 400, headers: noStore });
  }
  const r = await requestSeat(t, body.skole);
  if (!r.ok) return Response.json({ error: r.error }, { status: 400, headers: noStore });
  // Links in the mail go to /aftale on the main site, which the skole. subdomain doesn't serve.
  const { origin, host } = requestOrigin(req.headers, req.url);
  const main = isSkoleHost(host) ? origin.replace("://skole.", "://") : origin;
  const mailed = await mailSeatRequest(main, r.org, t);
  return Response.json({ asked: r.org.name, mailed }, { headers: noStore });
}
