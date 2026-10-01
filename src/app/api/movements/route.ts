import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { blockDemoWrites } from "@/lib/demo-access";

const schema = z.object({
  productId: z.string().min(1, "Produit requis"),
  type: z.enum(["IN", "OUT", "ADJUST"], {
    message: "Type de mouvement invalide",
  }),
  quantity: z.coerce.number().int("Quantité invalide"),
  note: z.string().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const movements = await db.stockMovement.findMany({
    where: { organizationId: user.organizationId },
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(movements);
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
  const { productId, type, quantity, note } = parsed.data;

  const product = await db.product.findFirst({
    where: { id: productId, organizationId: user.organizationId },
  });
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  if (type !== "ADJUST" && quantity <= 0) {
    return NextResponse.json(
      { error: "La quantité doit être positive" },
      { status: 400 }
    );
  }
  const delta = type === "IN" ? quantity : type === "OUT" ? -quantity : quantity;
  try {
    const movement = await db.$transaction(async (tx) => {
      const changed = await tx.product.updateMany({
        where: {
          id: product.id,
          organizationId: user.organizationId,
          ...(delta < 0 ? { quantity: { gte: -delta } } : {}),
        },
        data: { quantity: { increment: delta } },
      });
      if (changed.count !== 1) throw new Error("INSUFFICIENT_STOCK");
      return tx.stockMovement.create({
        data: {
          type,
          quantity: type === "ADJUST" ? delta : quantity,
          note: note || null,
          productId: product.id,
          userId: user.id,
          organizationId: user.organizationId,
        },
      });
    });
    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: `Stock insuffisant (disponible : ${product.quantity})` },
        { status: 400 }
      );
    }
    throw error;
  }
}
