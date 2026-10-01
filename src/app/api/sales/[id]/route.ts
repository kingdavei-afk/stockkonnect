import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { blockDemoWrites } from "@/lib/demo-access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const demoBlocked = blockDemoWrites(user);
  if (demoBlocked) return demoBlocked;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (body?.status !== "CANCELLED") {
    return NextResponse.json({ error: "Action non supportée" }, { status: 400 });
  }

  const sale = await db.sale.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!sale) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
  if (sale.status === "CANCELLED") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  try {
    await db.$transaction(async (tx) => {
    const claimed = await tx.sale.updateMany({
      where: { id: sale.id, organizationId: user.organizationId, status: "COMPLETED" },
      data: { status: "CANCELLED" },
    });
    if (claimed.count !== 1) throw new Error("ALREADY_CANCELLED");
    const items = await tx.saleItem.findMany({ where: { saleId: sale.id } });
    const quantities = new Map<string, number>();
    for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    for (const [productId, quantity] of quantities) {
      const changed = await tx.product.updateMany({
        where: { id: productId, organizationId: user.organizationId },
        data: { quantity: { increment: quantity } },
      });
      if (changed.count !== 1) continue;
      await tx.stockMovement.create({
        data: {
          type: "IN",
          quantity,
          note: `Annulation vente ${sale.reference}`,
          productId,
          userId: user.id,
          organizationId: user.organizationId,
        },
      });
    }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_CANCELLED") {
      return NextResponse.json({ ok: true, alreadyCancelled: true });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
