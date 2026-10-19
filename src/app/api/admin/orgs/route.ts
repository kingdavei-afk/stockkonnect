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
  planId: z.enum(["GRATUIT", "STARTER", "PRO", "BUSINESS"]).optional(),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
  // Fiche entreprise (modifiable par un super-admin)
  name: z.string().trim().min(2, "Nom d'entreprise trop court").optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Numéro WhatsApp trop long")
    .regex(/^(?:\+|00)?[\d\s().-]*$/, "Numéro WhatsApp invalide")
    .refine((value) => {
      const digitCount = value.replace(/\D/g, "").length;
      return value === "" || (digitCount >= 8 && digitCount <= 15);
    }, "Numéro WhatsApp invalide")
    .optional(),
  email: z.string().trim().email("Email d'entreprise invalide").or(z.literal("")).optional(),
  ownerName: z.string().trim().min(2, "Nom trop court").or(z.literal("")).optional(),
  ownerEmail: z.string().trim().email("Email du propriétaire invalide").or(z.literal("")).optional(),
}).refine(
  (data) =>
    data.status !== undefined ||
    data.planId !== undefined ||
    data.name !== undefined ||
    data.phone !== undefined ||
    data.email !== undefined ||
    data.ownerName !== undefined ||
    data.ownerEmail !== undefined,
  { message: "Aucune modification demandée" }
).refine((data) => data.billingCycle === undefined || data.planId !== undefined, {
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
  const { id, status, planId, billingCycle, name, phone, email, ownerName, ownerEmail } = parsed.data;

  const org = await db.organization.findUnique({ where: { id } });
  if (!org) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });

  // Le compte propriétaire est le premier utilisateur créé de l'organisation.
  // Chaines vides = "conserver" : ne déclenchent pas la recherche du proprio.
  const wantsOwnerEdit = Boolean(ownerName) || Boolean(ownerEmail);
  const owner = wantsOwnerEdit
    ? await db.user.findFirst({
        where: { organizationId: id },
        orderBy: { createdAt: "asc" },
      })
    : null;
  if (wantsOwnerEdit && !owner) {
    return NextResponse.json({ error: "Utilisateur propriétaire introuvable" }, { status: 404 });
  }
  if (wantsOwnerEdit && owner && ownerEmail && ownerEmail !== owner.email) {
    const taken = await db.user.findFirst({
      where: { email: ownerEmail, NOT: { id: owner.id } },
    });
    if (taken) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }
  }
  if (email) {
    const taken = await db.organization.findFirst({
      where: { email, NOT: { id } },
    });
    if (taken) {
      return NextResponse.json({ error: "Cet email d'entreprise est déjà utilisé" }, { status: 409 });
    }
  }

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
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...planSettings,
    },
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
      phone: true,
      email: true,
    },
  });
  if (owner && (ownerName || ownerEmail)) {
    await db.user.update({
      where: { id: owner.id },
      data: {
        ...(ownerName ? { name: ownerName } : {}),
        ...(ownerEmail ? { email: ownerEmail } : {}),
      },
    });
  }
  const freshOwner = await db.user.findFirst({
    where: { organizationId: id },
    orderBy: { createdAt: "asc" },
    select: { name: true, email: true },
  });
  return NextResponse.json({ ...updated, owner: { name: freshOwner?.name ?? null, email: freshOwner?.email ?? null } });
}
