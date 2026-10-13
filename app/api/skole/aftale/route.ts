import { findSchoolAgreements, today } from "@/lib/owner";
import { readLedger } from "@/lib/owner-store";

// budgetpro Skole: while a teacher signs up, tells whether the school they typed has an active agreement. Only school
// names that match come back (max 3), never seats, packs or who the kundeadmins are.
export async function GET(req: Request) {
  const typed = (new URL(req.url).searchParams.get("skole") ?? "").slice(0, 100);
  const schools = findSchoolAgreements((await readLedger()).orgs, typed, today());
  return Response.json({ schools }, { headers: { "Cache-Control": "no-store" } });
}
