import { Suspense } from "react";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlansClient } from "./plans-client";

export default async function PlansPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

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
  );
}
