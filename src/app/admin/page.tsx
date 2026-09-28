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

  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const [orgs, payments, revAgg, rev30d, planBreakdown, methodBreakdown] = await Promise.all([
    db.organization.findMany({
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
    }),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { organization: { select: { name: true, slug: true } } },
    }),
    // Revenus encaissés (SUCCESS uniquement)
    db.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
    db.payment.aggregate({
      where: { status: "SUCCESS", paidAt: { gte: since30d } },
      _sum: { amount: true },
      _count: true,
    }),
    db.payment.groupBy({
      by: ["planId"],
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
    db.payment.groupBy({
      by: ["providerMethod"],
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return (
    <AdminShell userName={account.name} logout={<LogoutButton />}>
      <AdminClient
        orgs={orgs.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))}
        payments={payments.map((p) => ({
          id: p.id,
          transactionId: p.transactionId,
          orgName: p.organization?.name ?? "—",
          amount: p.amount,
          cycle: p.cycle,
          planId: p.planId,
          status: p.status,
          method: p.providerMethod,
          paidAt: (p.paidAt ?? p.createdAt).toISOString(),
        }))}
        revenue={{
          total: revAgg._sum.amount ?? 0,
          count: revAgg._count,
          last30d: rev30d._sum.amount ?? 0,
          count30d: rev30d._count,
          byPlan: planBreakdown.map((g) => ({ planId: g.planId, amount: g._sum.amount ?? 0, count: g._count })),
          byMethod: methodBreakdown.map((g) => ({
            method: g.providerMethod,
            amount: g._sum.amount ?? 0,
            count: g._count,
          })),
        }}
      />
    </AdminShell>
  );
}
