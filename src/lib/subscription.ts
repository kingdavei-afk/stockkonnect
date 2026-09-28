import { db } from "@/lib/db";
import { getPlan, type PlanId } from "@/lib/plans";

/**
 * Active l'abonnement d'une organisation après paiement confirmé.
 * Idempotent : réactiver le même plan/cycle ne fait que prolonger.
 */
export async function activateSubscription(
  organizationId: string,
  planId: PlanId,
  cycle: "monthly" | "yearly"
) {
  const plan = getPlan(planId);
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: { _count: { select: { users: true } } },
  });
  if (!org) throw new Error("Entreprise introuvable");

  if (org._count.users > plan.maxUsers) {
    throw new Error(
      `Votre entreprise a ${org._count.users} utilisateurs : le plan ${plan.name} est limité à ${plan.maxUsers}.`
    );
  }

  const now = new Date();
  // Prolongation si l'offre actuelle est la même et encore valide
  const base =
    org.plan === planId && org.planEndsAt && org.planEndsAt > now && org.billingCycle === cycle
      ? org.planEndsAt
      : now;
  const ends = new Date(base);
  if (cycle === "monthly") ends.setMonth(ends.getMonth() + 1);
  else ends.setFullYear(ends.getFullYear() + 1);

  await db.organization.update({
    where: { id: org.id },
    data: {
      plan: planId,
      billingCycle: cycle,
      planStartsAt: org.plan === planId && org.planStartsAt ? org.planStartsAt : now,
      planEndsAt: ends,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      trialEndsAt: planId === "GRATUIT" ? org.trialEndsAt : null,
    },
  });

  return { endsAt: ends, amount: cycle === "monthly" ? plan.monthly : plan.yearly, planName: plan.name };
}
