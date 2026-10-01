import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { blockDemoWrites } from "@/lib/demo-access";

const schema = z.object({
  organizationName: z.string().min(2, "Nom d'entreprise trop court"),
  currency: z.enum(["EUR", "USD", "CHF", "GBP", "CAD", "MAD", "XOF"], {
    message: "Devise non supportée",
  }),
  lowStockThreshold: z.coerce.number().int().min(0, "Seuil invalide"),
  // Informations générales
  address: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  // Informations sur les documents
  taxId: z.string().max(60).optional().or(z.literal("")),
  bankAccount: z.string().max(60).optional().or(z.literal("")),
  mainActivities: z.string().max(500).optional().or(z.literal("")),
});

const clean = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const demoBlocked = blockDemoWrites(user);
  if (demoBlocked) return demoBlocked;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut modifier les paramètres" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  await db.$transaction([
    db.organization.update({
      where: { id: user.organizationId },
      data: {
        name: d.organizationName,
        address: clean(d.address),
        phone: clean(d.phone),
        email: clean(d.email),
        industry: clean(d.industry),
        taxId: clean(d.taxId),
        bankAccount: clean(d.bankAccount),
        mainActivities: clean(d.mainActivities),
      },
    }),
    db.settings.upsert({
      where: { organizationId: user.organizationId },
      update: { currency: d.currency, lowStockThreshold: d.lowStockThreshold },
      create: {
        organizationId: user.organizationId,
        currency: d.currency,
        lowStockThreshold: d.lowStockThreshold,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
