import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  customerId: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive("Quantité invalide"),
      })
    )
    .min(1, "Ajoutez au moins un article"),
});

function makeRef(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(
    Math.random() * 90 + 10
  )}`;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const sales = await db.sale.findMany({
    where: { organizationId: user.organizationId },
    include: {
      customer: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(sales);
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
  const { customerId, items } = parsed.data;

  const productIds = items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, organizationId: user.organizationId },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const p = byId.get(item.productId);
    if (!p) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
    if (p.quantity < item.quantity) {
      return NextResponse.json(
        { error: `Stock insuffisant pour « ${p.name} » (disponible : ${p.quantity})` },
        { status: 400 }
      );
    }
  }

  const total = items.reduce((sum, i) => {
    const p = byId.get(i.productId)!;
    return sum + p.price * i.quantity;
  }, 0);

  const sale = await db.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        reference: makeRef("VTE"),
        status: "COMPLETED",
        total,
        customerId: customerId || null,
        organizationId: user.organizationId,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: byId.get(i.productId)!.price,
          })),
        },
      },
    });
    for (const i of items) {
      await tx.product.update({
        where: { id: i.productId },
        data: { quantity: { decrement: i.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          type: "OUT",
          quantity: i.quantity,
          note: `Vente ${created.reference}`,
          productId: i.productId,
          userId: user.id,
          organizationId: user.organizationId,
        },
      });
    }
    return created;
  });

  return NextResponse.json(sale, { status: 201 });
}
