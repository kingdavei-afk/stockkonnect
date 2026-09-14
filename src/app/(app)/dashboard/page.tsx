import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const orgId = user.organizationId;
  const currency = user.organization.settings?.currency ?? "EUR";

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [products, salesMonth, purchasesMonth, recentMovements] = await Promise.all([
    db.product.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, quantity: true, minStock: true, price: true, cost: true },
    }),
    db.sale.findMany({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: { gte: monthStart },
      },
      select: { total: true, createdAt: true },
    }),
    db.purchase.findMany({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: { gte: monthStart },
      },
      select: { total: true },
    }),
    db.stockMovement.findMany({
      where: { organizationId: orgId },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const stockValue = products.reduce((s, p) => s + p.cost * p.quantity, 0);
  const revenueMonth = salesMonth.reduce((s, sale) => s + sale.total, 0);
  const costMonth = purchasesMonth.reduce((s, p) => s + p.total, 0);
  const lowStock = products
    .filter((p) => p.quantity <= p.minStock)
    .sort((a, b) => a.quantity - b.quantity);

  // Ventes des 14 derniers jours
  const days: { date: string; label: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const total = salesMonth
      .filter((s) => {
        const c = new Date(s.createdAt);
        return c >= d && c < next;
      })
      .reduce((sum, s) => sum + s.total, 0);
    days.push({
      date: d.toISOString(),
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      total: Math.round(total * 100) / 100,
    });
  }

  // Répartition de la valeur du stock par produit (top 6)
  const stockSplit = [...products]
    .map((p) => ({ name: p.name, value: Math.round(p.cost * p.quantity * 100) / 100 }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <DashboardClient
      currency={currency}
      kpis={{
        productCount: products.length,
        totalUnits: products.reduce((s, p) => s + p.quantity, 0),
        stockValue,
        revenueMonth,
        costMonth,
        salesCount: salesMonth.length,
        lowStockCount: lowStock.length,
      }}
      salesByDay={days}
      stockSplit={stockSplit}
      lowStock={lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        minStock: p.minStock,
      }))}
      recentMovements={recentMovements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        createdAt: m.createdAt.toISOString(),
        productName: m.product.name,
        note: m.note,
      }))}
    />
  );
}
