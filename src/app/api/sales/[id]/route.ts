import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (body?.status !== "CANCELLED") {
    return NextResponse.json({ error: "Action non supportée" }, { status: 400 });
  }

  const sale = await db.sale.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { items: true },
  });
  if (!sale) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
  if (sale.status === "CANCELLED") {
    return NextResponse.json({ error: "Vente déjà annulée" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: { status: "CANCELLED" },
    });
    for (const item of sale.items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, organizationId: user.organizationId },
      });
      if (!product) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          type: "IN",
          quantity: item.quantity,
          note: `Annulation vente ${sale.reference}`,
          productId: item.productId,
          userId: user.id,
          organizationId: user.organizationId,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
