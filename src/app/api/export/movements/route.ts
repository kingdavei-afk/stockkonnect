import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

const TYPE_LABELS: Record<string, string> = {
  IN: "Entrée",
  OUT: "Sortie",
  ADJUST: "Ajustement",
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const [movements, users] = await Promise.all([
    db.stockMovement.findMany({
      where: { organizationId: user.organizationId },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
    }),
  ]);
  const userName = new Map(users.map((u) => [u.id, u.name]));

  const csv = toCsv(
    ["Date", "Produit", "SKU", "Type", "Quantité", "Note", "Par"],
    movements.map((m) => [
      new Date(m.createdAt).toLocaleString("fr-FR"),
      m.product.name,
      m.product.sku,
      TYPE_LABELS[m.type] ?? m.type,
      m.quantity > 0 ? `+${m.quantity}` : m.quantity,
      m.note ?? "",
      m.userId ? userName.get(m.userId) ?? "" : "",
    ])
  );

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`mouvements-${date}.csv`, csv);
}
