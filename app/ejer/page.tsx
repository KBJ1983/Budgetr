import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";
import { isOwner, loadOverview } from "@/lib/owner-store";
import { SESSION_COOKIE } from "@/lib/session";
import "../login/app.css";
import "./owner.css";

export const metadata: Metadata = { title: "budgetpro – ejeroverblik", robots: { index: false } };

export default async function OwnerPage() {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isOwner(cookie))) {
    return (
      <div className="bx">
        <main className="bx-wrap bx-main">
          <div className="bx-empty" style={{ marginTop: 48 }}>
            <b>Ejeroverblikket kræver login</b>
            <span>Log ind med en e-mail, der er sat op som ejer.</span>
            <Link className="bx-btn bx-btn-primary" href="/login?next=/ejer">
              Log ind
            </Link>
          </div>
        </main>
      </div>
    );
  }
  return <OwnerDashboard initial={await loadOverview()} dev={process.env.NODE_ENV !== "production"} />;
}
