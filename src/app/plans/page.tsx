import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { PlansClient } from "./plans-client";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/logout-button";

export default async function PlansPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={null}>
            <PlansClient isPublic currentPlan={null} currentCycle={null} userCount={0} payments={[]} />
          </Suspense>
        </div>
      </main>
    );
  }

  const [org, payments] = await Promise.all([
    db.organization.findUnique({
      where: { id: user.organizationId },
      include: { _count: { select: { users: true } } },
    }),
    db.payment.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        transactionId: true,
        amount: true,
        cycle: true,
        planId: true,
        status: true,
        providerMethod: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <AppShell
      userName={user.name}
      organizationName={user.organization.name}
      role={user.role}
      logout={<LogoutButton />}
    >
      <Suspense fallback={null}>
        <PlansClient
          isAdmin={user.role === "ADMIN"}
          organizationName={user.organization.name}
          currentPlan={org?.plan ?? "GRATUIT"}
          currentCycle={(org?.billingCycle as "monthly" | "yearly" | null) ?? null}
          userCount={org?._count.users ?? 1}
          payments={payments.map((p) => ({
            id: p.id,
            transactionId: p.transactionId,
            amount: p.amount,
            cycle: p.cycle,
            planId: p.planId,
            status: p.status,
            method: p.providerMethod,
            paidAt: (p.paidAt ?? p.createdAt).toISOString(),
          }))}
        />
      </Suspense>
    </AppShell>
  );
}
