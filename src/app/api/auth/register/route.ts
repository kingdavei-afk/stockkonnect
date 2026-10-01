import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const schema = z.object({
  name: z.string().min(2, "Nom trop court"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum"),
  organizationName: z.string().min(2, "Nom d'entreprise trop court"),
  whatsappNumber: z
    .string()
    .trim()
    .min(8, "Numéro WhatsApp invalide")
    .max(30, "Numéro WhatsApp trop long")
    .regex(/^(?:\+|00)?[\d\s().-]+$/, "Numéro WhatsApp invalide")
    .refine((value) => {
      const digitCount = value.replace(/\D/g, "").length;
      return digitCount >= 8 && digitCount <= 15;
    }, "Numéro WhatsApp invalide"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const { name, email, password, organizationName, whatsappNumber } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
  }

  let slug = slugify(organizationName) || "entreprise";
  if (await db.organization.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7); // essai gratuit de 7 jours
  const org = await db.organization.create({
    data: {
      name: organizationName,
      slug,
      phone: whatsappNumber,
      plan: "GRATUIT",
      maxUsers: 2,
      maxProducts: 10,
      trialEndsAt,
      users: {
        create: {
          email,
          name,
          passwordHash,
          role: "ADMIN",
        },
      },
      settings: { create: {} },
    },
  });

  const user = await db.user.findFirstOrThrow({
    where: { organizationId: org.id },
  });

  await startSession({ userId: user.id, orgId: org.id, role: user.role });
  return NextResponse.json({ ok: true });
}
