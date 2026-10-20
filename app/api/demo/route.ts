import { writeBudget } from "@/lib/budget-file";
import { DEMO_USER, demoCustomer } from "@/lib/demo-customer";
import { tryNoteGoal } from "@/lib/traffic-store";

// Resets the demo customer's budget to the fictional example (used by /demobruger). The demo is a test user,
// so anyone may reset it; it holds no real data.
export async function POST(req: Request) {
  await writeBudget(DEMO_USER, JSON.stringify(demoCustomer()));
  await tryNoteGoal("demo", req.headers);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
