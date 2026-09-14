import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatMoney } from "@/lib/money";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const currency = user.organization.settings?.currency ?? "EUR";

  const purchases = await db.purchase.findMany({
    where: { organizationId: user.organizationId },
    include: {
      supplier: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    ["Référence", "Date", "Fournisseur", "Articles", "Total", "Statut"],
    purchases.map((p) => [
      p.reference,
      new Date(p.createdAt).toLocaleString("fr-FR"),
      p.supplier?.name ?? "",
      p.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", "),
      formatMoney(p.total, currency),
      p.status === "COMPLETED" ? "Terminé" : "Annulé",
    ])
  );

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`approvisionnements-${date}.csv`, csv);
}
