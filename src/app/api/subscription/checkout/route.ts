import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { activateSubscription } from "@/lib/subscription";

const schema = z.object({
  planId: z.enum(["GRATUIT", "PRO", "BUSINESS"]),
  cycle: z.enum(["monthly", "yearly"]),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut gérer l'abonnement" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { planId, cycle } = parsed.data;

  if (planId !== "GRATUIT") {
    return NextResponse.json(
      { error: "Les abonnements payants sont gérés manuellement. Contactez Stockkonect sur WhatsApp au +225 07 48 32 31 91." },
      { status: 409 }
    );
  }

  const org = await db.organization.findUnique({ where: { id: user.organizationId } });
  if (!org) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });

  const result = await activateSubscription(org.id, planId, cycle);
  return NextResponse.json({ ok: true, mode: "gratuit", endsAt: result.endsAt.toISOString() });
}
