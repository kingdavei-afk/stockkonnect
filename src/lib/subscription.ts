import { db } from "@/lib/db";
import { getPlan, type PlanId } from "@/lib/plans";
import type { Prisma } from "@prisma/client";

type SubscriptionClient = Pick<Prisma.TransactionClient, "organization">;

export class SubscriptionActivationError extends Error {}

/** Adds one subscription period while keeping the day in months of different lengths. */
export function subscriptionPeriodEnd(start: Date, cycle: "monthly" | "yearly"): Date {
  const months = cycle === "monthly" ? 1 : 12;
  const result = new Date(start);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/**
 * Active l'abonnement d'une organisation après paiement confirmé.
 * Idempotent : réactiver le même plan/cycle ne fait que prolonger.
 */
export async function activateSubscription(
  organizationId: string,
  planId: PlanId,
  cycle: "monthly" | "yearly",
  client: SubscriptionClient = db
) {
  const plan = getPlan(planId);
  const org = await client.organization.findUnique({
    where: { id: organizationId },
    include: { _count: { select: { users: true } } },
  });
  if (!org) throw new SubscriptionActivationError("Entreprise introuvable");

  if (org._count.users > plan.maxUsers) {
    throw new SubscriptionActivationError(
      `Votre entreprise a ${org._count.users} utilisateurs : le plan ${plan.name} est limité à ${plan.maxUsers}.`
    );
  }

  const now = new Date();
  // Prolongation si l'offre actuelle est la même et encore valide
  const base =
    org.plan === planId && org.planEndsAt && org.planEndsAt > now && org.billingCycle === cycle
      ? org.planEndsAt
      : now;
  const ends = subscriptionPeriodEnd(base, cycle);

  await client.organization.update({
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
