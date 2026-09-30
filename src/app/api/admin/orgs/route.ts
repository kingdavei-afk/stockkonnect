import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { db } from "@/lib/db";
import { getSessionAccount, isSuperAdmin } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { subscriptionPeriodEnd } from "@/lib/subscription";

export async function GET() {
  const account = await getSessionAccount();
  if (!isSuperAdmin(account)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const orgs = await db.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      maxUsers: true,
      maxProducts: true,
      billingCycle: true,
      planEndsAt: true,
      trialEndsAt: true,
      status: true,
      createdAt: true,
      _count: {
        select: { users: true, products: true, sales: true, purchases: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orgs);
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  planId: z.enum(["GRATUIT", "PRO", "BUSINESS"]).optional(),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
}).refine((data) => data.status !== undefined || data.planId !== undefined, {
  message: "Aucune modification demandée",
}).refine((data) => data.billingCycle === undefined || data.planId !== undefined, {
  message: "Un cycle nécessite un plan",
});

export async function PATCH(req: NextRequest) {
  const account = await getSessionAccount();
  if (!isSuperAdmin(account)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  }
  const { id, status, planId, billingCycle } = parsed.data;

  const org = await db.organization.findUnique({ where: { id } });
  if (!org) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });

  let planSettings = {};
  if (planId) {
    const plan = getPlan(planId);
    const cycle = planId === "GRATUIT" ? null : billingCycle ?? "monthly";
    const userCount = await db.user.count({ where: { organizationId: id } });
    if (userCount > plan.maxUsers) {
      return NextResponse.json(
        { error: `Cette entreprise compte ${userCount} utilisateurs, le plan ${plan.name} en autorise ${plan.maxUsers}.` },
        { status: 400 }
      );
    }
    const startsAt = new Date();
    const freeTrialEndsAt = plan.trialDays
      ? new Date(startsAt.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;
    planSettings = {
      plan: planId,
      billingCycle: cycle,
      planStartsAt: startsAt,
      planEndsAt: cycle ? subscriptionPeriodEnd(startsAt, cycle) : null,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      trialEndsAt: freeTrialEndsAt,
    };
  }

  const updated = await db.organization.update({
    where: { id },
    data: { ...(status !== undefined ? { status } : {}), ...planSettings },
    select: {
      id: true,
      name: true,
      status: true,
      plan: true,
      maxUsers: true,
      maxProducts: true,
      billingCycle: true,
      planEndsAt: true,
      trialEndsAt: true,
    },
  });
  return NextResponse.json(updated);
}
