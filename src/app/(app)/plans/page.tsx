import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlansClient } from "./plans-client";

export default async function PlansPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    include: { _count: { select: { users: true } } },
  });

  return (
    <PlansClient
      isAdmin={user.role === "ADMIN"}
      currentPlan={org?.plan ?? "GRATUIT"}
      currentCycle={(org?.billingCycle as "monthly" | "yearly" | null) ?? null}
      userCount={org?._count.users ?? 1}
      currency={user.organization.settings?.currency ?? "XOF"}
    />
  );
}
