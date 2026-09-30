import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { referencesBelongToOrganization } from "@/lib/organization-refs";

const schema = z.object({
  supplierId: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive("Quantité invalide"),
        unitCost: z.coerce.number().min(0, "Coût invalide").optional(),
      })
    )
    .min(1, "Ajoutez au moins un article"),
});

function makeRef() {
  return `ACH-${Date.now().toString(36).toUpperCase()}${Math.floor(
    Math.random() * 90 + 10
  )}`;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const purchases = await db.purchase.findMany({
    where: { organizationId: user.organizationId },
    include: {
      supplier: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(purchases);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const { supplierId, items } = parsed.data;

  try {
    const purchase = await db.$transaction(async (tx) => {
    if (!(await referencesBelongToOrganization(tx, user.organizationId, { supplierId }))) {
      throw new Error("REFERENCE_NOT_FOUND");
    }
    const products = await tx.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, organizationId: user.organizationId },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    if (byId.size !== new Set(items.map((i) => i.productId)).size) throw new Error("REFERENCE_NOT_FOUND");
    const total = items.reduce((sum, i) => sum + (i.unitCost ?? byId.get(i.productId)!.cost) * i.quantity, 0);

    const created = await tx.purchase.create({
      data: {
        reference: makeRef(),
        status: "COMPLETED",
        total,
        supplierId: supplierId || null,
        organizationId: user.organizationId,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost ?? byId.get(i.productId)!.cost,
          })),
        },
      },
    });
    const quantities = new Map<string, number>();
    for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    for (const [productId, quantity] of quantities) {
      await tx.product.updateMany({
        where: { id: productId, organizationId: user.organizationId },
        data: { quantity: { increment: quantity } },
      });
      await tx.stockMovement.create({
        data: {
          type: "IN",
          quantity,
          note: `Approvisionnement ${created.reference}`,
          productId,
          userId: user.id,
          organizationId: user.organizationId,
        },
      });
    }
    return created;
    });
    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "REFERENCE_NOT_FOUND") {
      return NextResponse.json({ error: "Fournisseur ou produit introuvable" }, { status: 404 });
    }
    throw error;
  }
}
