import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { blockDemoWrites } from "@/lib/demo-access";

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
  const demoBlocked = blockDemoWrites(user);
  if (demoBlocked) return demoBlocked;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const { customerId, items } = parsed.data;
  const quantities = new Map<string, number>();
  for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);

  try {
    const sale = await db.$transaction(async (tx) => {
    if (customerId && !(await tx.customer.count({ where: { id: customerId, organizationId: user.organizationId } }))) {
      throw new Error("REFERENCE_NOT_FOUND");
    }
    const products = await tx.product.findMany({
      where: { id: { in: [...quantities.keys()] }, organizationId: user.organizationId },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    if (byId.size !== quantities.size) throw new Error("REFERENCE_NOT_FOUND");

    let total = 0;
    for (const [productId, quantity] of quantities) {
      const product = byId.get(productId)!;
      total += product.price * quantity;
      const changed = await tx.product.updateMany({
        where: { id: productId, organizationId: user.organizationId, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (changed.count !== 1) throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
    }

    const created = await tx.sale.create({
      data: {
        reference: makeRef("VTE"),
        status: "COMPLETED",
        total,
        customerId: customerId || null,
        organizationId: user.organizationId,
        items: {
          create: [...quantities].map(([productId, quantity]) => ({
            productId,
            quantity,
            unitPrice: byId.get(productId)!.price,
          })),
        },
      },
    });
    for (const [productId, quantity] of quantities) {
      await tx.stockMovement.create({
        data: {
          type: "OUT",
          quantity,
          note: `Vente ${created.reference}`,
          productId,
          userId: user.id,
          organizationId: user.organizationId,
        },
      });
    }
    return created;
  });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "REFERENCE_NOT_FOUND") return NextResponse.json({ error: "Client ou produit introuvable" }, { status: 404 });
    if (message.startsWith("INSUFFICIENT_STOCK:")) {
      return NextResponse.json({ error: `Stock insuffisant pour « ${message.slice("INSUFFICIENT_STOCK:".length)} »` }, { status: 400 });
    }
    throw error;
  }
}
