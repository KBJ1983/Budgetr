import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminLogin } from "@/components/owner/AdminLogin";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";
import { isOwner, loadOverview } from "@/lib/owner-store";
import { ADMIN_COOKIE, SESSION_COOKIE } from "@/lib/session";
import "../login/app.css";
import "./owner.css";

// Neutral title: the login shouldn't say what is behind it.
export const metadata: Metadata = { title: "budgetpro – log ind", robots: { index: false } };

/** Owner overview behind the owner's own login (lib/owner-store.ts). */
export default async function AdminPage() {
  const jar = await cookies();
  const owner = await isOwner({ session: jar.get(SESSION_COOKIE)?.value, admin: jar.get(ADMIN_COOKIE)?.value });
  if (!owner) return <AdminLogin />;
  return (
    <OwnerDashboard
      initial={await loadOverview()}
      dev={process.env.NODE_ENV !== "production" && !process.env.ADMIN_PASSWORD}
      canLogOut={!!jar.get(ADMIN_COOKIE)?.value}
    />
  );
}
