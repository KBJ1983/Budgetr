import { cookies } from "next/headers";
import { AGREEMENT_COOKIE } from "@/lib/session";

// /aftale: ends the kundeadmin's session.
export async function POST() {
  (await cookies()).delete(AGREEMENT_COOKIE);
  return new Response(null, { status: 204 });
}
