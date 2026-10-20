import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";

const schema = z.object({
  // Identifiant de connexion : email ou numéro WhatsApp (normalisé côté serveur).
  identifier: z.string().trim().min(1, "Identifiant requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

const ORG_INCLUDE = {
  organization: { select: { status: true, phone: true } },
} satisfies Prisma.UserInclude;

type LoginUser = Prisma.UserGetPayload<{ include: typeof ORG_INCLUDE }>;

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Réduit un numéro WhatsApp à ses chiffres (le préfixe international 00 est
 * retiré). Renvoie null si la saisie ne peut pas être un numéro.
 */
function whatsappDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/**
 * Compare deux numéros WhatsApp. Les numéros sont saisis librement (`+225…`,
 * `00225…`, `07 00 00 00 00`…), on compare donc les 9 derniers chiffres
 * significatifs quand les écritures complètes diffèrent.
 */
function isSameWhatsapp(a: string, b: string): boolean {
  const digitsA = whatsappDigits(a);
  const digitsB = whatsappDigits(b);
  if (!digitsA || !digitsB) return false;
  if (digitsA === digitsB) return true;
  const size = 9;
  return (
    digitsA.length >= size &&
    digitsB.length >= size &&
    digitsA.slice(-size) === digitsB.slice(-size)
  );
}

async function findCandidates(identifier: string): Promise<LoginUser[]> {
  if (isEmailLike(identifier)) {
    const user = await db.user.findFirst({
      where: { email: { equals: identifier, mode: "insensitive" } },
      include: ORG_INCLUDE,
    });
    return user ? [user] : [];
  }

  if (whatsappDigits(identifier) === null) return [];

  // Le numéro est saisi librement sur l'organisation : on filtre les
  // organisations ayant un numéro, puis on compare les numéros normalisés.
  const orgs = await db.organization.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });
  const orgIds = orgs
    .filter((org) => org.phone !== null && isSameWhatsapp(org.phone, identifier))
    .map((org) => org.id);
  if (orgIds.length === 0) return [];

  return db.user.findMany({
    where: { organizationId: { in: orgIds } },
    include: ORG_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const { identifier, password } = parsed.data;

  const candidates = await findCandidates(identifier);

  // Un numéro WhatsApp appartient à l'organisation : plusieurs comptes peuvent
  // le partager, on retient donc celui dont le mot de passe correspond.
  for (const user of candidates) {
    if (!(await bcrypt.compare(password, user.passwordHash))) continue;

    if (user.organization?.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Votre entreprise est suspendue. Contactez le support." },
        { status: 403 }
      );
    }

    await startSession({
      userId: user.id,
      orgId: user.organizationId ?? "",
      role: user.role,
      sessionVersion: user.sessionVersion,
    });
    return NextResponse.json({ ok: true, role: user.role });
  }

  return NextResponse.json(
    { error: "Identifiant ou mot de passe incorrect" },
    { status: 401 }
  );
}
