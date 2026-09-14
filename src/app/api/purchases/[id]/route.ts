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

  const purchase = await db.purchase.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { items: true },
  });
  if (!purchase) return NextResponse.json({ error: "Approvisionnement introuvable" }, { status: 404 });
  if (purchase.status === "CANCELLED") {
    return NextResponse.json({ error: "Déjà annulé" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: "CANCELLED" },
    });
    for (const item of purchase.items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, organizationId: user.organizationId },
      });
      if (!product) continue;
      if (product.quantity < item.quantity) {
        return NextResponse.json(
          { error: "Annulation impossible : stock déjà consommé" },
          { status: 400 }
        );
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          type: "OUT",
          quantity: item.quantity,
          note: `Annulation approvisionnement ${purchase.reference}`,
          productId: item.productId,
          userId: user.id,
          organizationId: user.organizationId,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
