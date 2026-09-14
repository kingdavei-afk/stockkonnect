import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { getPlan } from "@/lib/plans";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    include: { _count: { select: { users: true, products: true } } },
  });
  const settings = org ? await db.settings.findUnique({ where: { organizationId: org.id } }) : null;
  const plan = getPlan(org?.plan ?? "GRATUIT");

  return (
    <SettingsClient
      isAdmin={user.role === "ADMIN"}
      userName={user.name}
      userEmail={user.email}
      role={user.role}
      organization={{
        name: org?.name ?? "",
        address: org?.address ?? "",
        phone: org?.phone ?? "",
        email: org?.email ?? "",
        industry: org?.industry ?? "",
        taxId: org?.taxId ?? "",
        bankAccount: org?.bankAccount ?? "",
        mainActivities: org?.mainActivities ?? "",
      }}
      currency={settings?.currency ?? "EUR"}
      lowStockThreshold={settings?.lowStockThreshold ?? 5}
      subscription={{
        planId: plan.id,
        planName: plan.name,
        startsAt: org?.planStartsAt?.toISOString() ?? null,
        endsAt: org?.planEndsAt?.toISOString() ?? null,
        trialEndsAt: org?.trialEndsAt?.toISOString() ?? null,
        userCount: org?._count.users ?? 1,
        maxUsers: org?.maxUsers ?? 2,
        productCount: org?._count.products ?? 0,
        maxProducts: org?.maxProducts ?? null,
        monthlyPrice: plan.monthly,
        cycle: (org?.billingCycle as "monthly" | "yearly" | null) ?? null,
        modules: plan.modules,
      }}
    />
  );
}
