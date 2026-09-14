import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

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

  const productIds = items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, organizationId: user.organizationId },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    if (!byId.has(item.productId)) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
  }

  const total = items.reduce((sum, i) => {
    const p = byId.get(i.productId)!;
    const unit = i.unitCost ?? p.cost;
    return sum + unit * i.quantity;
  }, 0);

  const purchase = await db.$transaction(async (tx) => {
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
    for (const i of items) {
      await tx.product.update({
        where: { id: i.productId },
        data: { quantity: { increment: i.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          type: "IN",
          quantity: i.quantity,
          note: `Approvisionnement ${created.reference}`,
          productId: i.productId,
          userId: user.id,
          organizationId: user.organizationId,
        },
      });
    }
    return created;
  });

  return NextResponse.json(purchase, { status: 201 });
}
