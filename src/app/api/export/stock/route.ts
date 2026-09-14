import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatMoney } from "@/lib/money";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const currency = user.organization.settings?.currency ?? "EUR";

  const products = await db.product.findMany({
    where: { organizationId: user.organizationId },
    include: {
      category: { select: { name: true } },
      supplier: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const csv = toCsv(
    [
      "SKU",
      "Code-barres",
      "Produit",
      "Catégorie",
      "Fournisseur",
      "Quantité",
      "Seuil alerte",
      "Prix de vente",
      "Coût d'achat",
      "Valeur du stock",
      "Statut",
    ],
    products.map((p) => [
      p.sku,
      p.barcode ?? "",
      p.name,
      p.category?.name ?? "",
      p.supplier?.name ?? "",
      p.quantity,
      p.minStock,
      formatMoney(p.price, currency),
      formatMoney(p.cost, currency),
      formatMoney(p.cost * p.quantity, currency),
      p.quantity === 0 ? "Rupture" : p.quantity <= p.minStock ? "Stock bas" : "OK",
    ])
  );

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`stock-${date}.csv`, csv);
}
