import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { isEmailLike, isSameWhatsapp, whatsappDigits } from "@/lib/login-identifier";
import { authRateLimit, clientIp, rateLimitMessage } from "@/lib/auth-rate-limit";

const schema = z.object({
  // Identifiant de connexion : email ou numéro WhatsApp (normalisé côté serveur).
  identifier: z.string().trim().min(1, "Identifiant requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

const ORG_INCLUDE = {
  organization: { select: { status: true, phone: true } },
} satisfies Prisma.UserInclude;

type LoginUser = Prisma.UserGetPayload<{ include: typeof ORG_INCLUDE }>;

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
  const ip = clientIp(req);

  // Bloque avant toute vérification : sans cela, un essai de mot de passe
  // coûterait un bcrypt.compare par compte partageant le numéro WhatsApp.
  const limit = await authRateLimit.check("login", { identifier, ip });
  if (limit.limited) {
    return NextResponse.json(
      { error: rateLimitMessage("login", limit.retryAfterSeconds) },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

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

    // Mot de passe correct : la saisie n'était pas une attaque, on remet le
    // compteur de cet identifiant à zéro.
    await authRateLimit.clear("login", { identifier });
    await startSession({
      userId: user.id,
      orgId: user.organizationId ?? "",
      role: user.role,
      sessionVersion: user.sessionVersion,
    });
    return NextResponse.json({ ok: true, role: user.role });
  }

  await authRateLimit.record("login", { identifier, ip });
  return NextResponse.json(
    { error: "Identifiant ou mot de passe incorrect" },
    { status: 401 }
  );
}
