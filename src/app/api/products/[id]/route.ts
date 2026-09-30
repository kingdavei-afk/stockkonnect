import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { referencesBelongToOrganization } from "@/lib/organization-refs";

const updateSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  sku: z.string().min(1, "SKU requis"),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "Prix invalide"),
  cost: z.coerce.number().min(0, "Coût invalide"),
  minStock: z.coerce.number().int().min(0, "Seuil invalide"),
  image: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
});

async function getOwnedProduct(id: string, orgId: string) {
  return db.product.findFirst({ where: { id, organizationId: orgId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const product = await getOwnedProduct(id, user.organizationId);
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (!(await referencesBelongToOrganization(db, user.organizationId, data))) {
    return NextResponse.json({ error: "Catégorie ou fournisseur introuvable" }, { status: 404 });
  }

  const duplicate = await db.product.findFirst({
    where: { organizationId: user.organizationId, sku: data.sku, id: { not: id } },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Ce SKU existe déjà" }, { status: 409 });
  }

  const updated = await db.product.update({
    where: { id },
    data: {
      ...data,
      barcode: data.barcode || null,
      description: data.description || null,
      image: data.image || null,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const product = await getOwnedProduct(id, user.organizationId);
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  await db.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
