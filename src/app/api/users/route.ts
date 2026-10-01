import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(2, "Nom trop court"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum"),
  role: z.enum(["ADMIN", "STAFF"]),
});

const updateSchema = z.object({
  name: z.string().min(2, "Nom trop court").optional(),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum").optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const users = await db.user.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut inviter des utilisateurs" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  }
  const { name, email, password, role } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
  }

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    include: { _count: { select: { users: true } } },
  });
  if (org && org._count.users >= org.maxUsers) {
    return NextResponse.json(
      { error: `Limite de votre offre ${org.plan === "BUSINESS" ? "Business" : org.plan === "PRO" ? "Pro" : org.plan === "STARTER" ? "Starter" : "Gratuit"} atteinte (${org.maxUsers} utilisateurs). Changez d'offre depuis les Paramètres.` },
      { status: 402 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await db.user.create({
    data: { name, email, passwordHash, role, organizationId: user.organizationId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut modifier les utilisateurs" }, { status: 403 });
  }

  const parsed = updateSchema.merge(z.object({ id: z.string() })).safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  }
  const { id, name, password, role } = parsed.data;

  const target = await db.user.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Empêcher de retirer le dernier admin de l'organisation
  if (target.role === "ADMIN" && role === "STAFF") {
    const admins = await db.user.count({
      where: { organizationId: user.organizationId, role: "ADMIN" },
    });
    if (admins <= 1) {
      return NextResponse.json(
        { error: "Impossible de retirer le dernier administrateur" },
        { status: 400 }
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (password !== undefined) data.passwordHash = await bcrypt.hash(password, 10);

  const updated = await db.user.update({
    where: { id: target.id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut supprimer des utilisateurs" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Paramètre id requis" }, { status: 400 });
  if (id === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
  }

  const target = await db.user.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  if (target.role === "ADMIN") {
    const admins = await db.user.count({
      where: { organizationId: user.organizationId, role: "ADMIN" },
    });
    if (admins <= 1) {
      return NextResponse.json(
        { error: "Impossible de supprimer le dernier administrateur" },
        { status: 400 }
      );
    }
  }

  await db.user.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true });
}
