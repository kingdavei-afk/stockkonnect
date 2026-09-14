import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { PLANS } from "@/lib/plans";

const schema = z.object({
  planId: z.enum(["GRATUIT", "PRO", "BUSINESS"]),
  cycle: z.enum(["monthly", "yearly"]),
  // Simulation de paiement mobile money / carte
  paymentMethod: z.enum(["orange-money", "wave", "mtn-money", "card"]),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut gérer l'abonnement" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  }
  const { planId, cycle, paymentMethod } = parsed.data;
  const plan = PLANS.find((p) => p.id === planId)!;

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    include: { _count: { select: { users: true } } },
  });
  if (!org) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });

  // Ne pas descendre sous le nombre d'utilisateurs actuels
  if (org._count.users > plan.maxUsers) {
    return NextResponse.json(
      {
        error: `Votre entreprise a ${org._count.users} utilisateurs : le plan ${plan.name} est limité à ${plan.maxUsers}. Supprimez des utilisateurs d'abord.`,
      },
      { status: 400 }
    );
  }

  const now = new Date();
  const ends = new Date(now);
  if (cycle === "monthly") ends.setMonth(ends.getMonth() + 1);
  else ends.setFullYear(ends.getFullYear() + 1);

  await db.organization.update({
    where: { id: org.id },
    data: {
      plan: planId,
      billingCycle: cycle,
      planStartsAt: now,
      planEndsAt: ends,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      trialEndsAt: planId === "GRATUIT" ? org.trialEndsAt : null,
    },
  });

  // Simulation de paiement : en production, remplacer par un vrai passage de caisse
  const labels: Record<string, string> = {
    "orange-money": "Orange Money",
    wave: "Wave",
    "mtn-money": "MTN Money",
    card: "Carte bancaire",
  };
  return NextResponse.json({
    ok: true,
    plan: plan.name,
    cycle,
    amountPaid: cycle === "monthly" ? plan.monthly : plan.yearly,
    method: labels[paymentMethod],
    endsAt: ends.toISOString(),
  });
}
