import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { db } from "@/lib/db";
import { getSessionAccount, isSuperAdmin } from "@/lib/auth";

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
  status: z.enum(["ACTIVE", "SUSPENDED"]),
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
  const { id, status } = parsed.data;

  const org = await db.organization.findUnique({ where: { id } });
  if (!org) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });

  const updated = await db.organization.update({
    where: { id },
    data: { status },
    select: { id: true, name: true, status: true },
  });
  return NextResponse.json(updated);
}
