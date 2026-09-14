import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatMoney } from "@/lib/money";

function parseDateParam(raw: string | null, endOfDay = false): Date | undefined {
  if (!raw) return undefined;
  // Format attendu : YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const d = new Date(raw + "T00:00:00");
  if (isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const currency = user.organization.settings?.currency ?? "EUR";

  const fromRaw = req.nextUrl.searchParams.get("from");
  const toRaw = req.nextUrl.searchParams.get("to");
  const from = parseDateParam(fromRaw);
  const to = parseDateParam(toRaw, true);

  // bornes incohérentes → plage vide explicite plutôt qu'un export complet surprenant
  if (from && to && from > to) {
    return NextResponse.json({ error: "La date de début est après la date de fin" }, { status: 400 });
  }

  const sales = await db.sale.findMany({
    where: {
      organizationId: user.organizationId,
      createdAt: { gte: from, lte: to },
    },
    include: {
      customer: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    ["Référence", "Date", "Client", "Articles", "Total", "Statut"],
    sales.map((s) => [
      s.reference,
      new Date(s.createdAt).toLocaleString("fr-FR"),
      s.customer?.name ?? "",
      s.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", "),
      formatMoney(s.total, currency),
      s.status === "COMPLETED" ? "Terminée" : "Annulée",
    ])
  );

  // Nom de fichier selon la période : ventes-2026-09-01_2026-09-13.csv ou ventes-tout.csv
  const suffix =
    /^\d{4}-\d{2}-\d{2}$/.test(fromRaw ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(toRaw ?? "")
      ? `${fromRaw}_${toRaw}`
      : "tout";
  return csvResponse(`ventes-${suffix}.csv`, csv);
}
