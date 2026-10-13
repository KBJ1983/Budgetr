import { cookies } from "next/headers";
import { TEACHER_COOKIE } from "@/lib/session";

// budgetpro Skole: ends the teacher's session.
export async function POST() {
  (await cookies()).delete(TEACHER_COOKIE);
  return new Response(null, { status: 204 });
}
