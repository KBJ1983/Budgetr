import { writeBudget } from "@/lib/budget-file";
import { DEMO_USER, demoCustomer } from "@/lib/demo-customer";

// Resets the demo customer's budget to the fictional example (used by /demobruger). The demo is a test user,
// so anyone may reset it; it holds no real data.
export async function POST() {
  await writeBudget(DEMO_USER, JSON.stringify(demoCustomer()));
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
