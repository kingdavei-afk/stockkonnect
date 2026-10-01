import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { blockDemoWrites } from "@/lib/demo-access";

const schema = z.object({ name: z.string().min(1, "Nom requis") });

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const rows = await db.category.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const demoBlocked = blockDemoWrites(user);
  if (demoBlocked) return demoBlocked;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const duplicate = await db.category.findFirst({
    where: { organizationId: user.organizationId, name: parsed.data.name },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Cette catégorie existe déjà" }, { status: 409 });
  }
  const row = await db.category.create({
    data: { name: parsed.data.name, organizationId: user.organizationId },
  });
  return NextResponse.json(row, { status: 201 });
}
