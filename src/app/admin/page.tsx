import { getSessionAccount, isSuperAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminClient } from "./admin-client";
import { AdminShell } from "@/components/admin-shell";
import { LogoutButton } from "@/components/logout-button";

export default async function AdminPage() {
  const account = await getSessionAccount();
  if (!account) redirect("/login");
  if (!isSuperAdmin(account)) redirect("/dashboard");

  const orgs = await db.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      maxUsers: true,
      status: true,
      createdAt: true,
      _count: { select: { users: true, products: true, sales: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell userName={account.name} logout={<LogoutButton /> }>
      <AdminClient orgs={orgs.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))} />
    </AdminShell>
  );
}
