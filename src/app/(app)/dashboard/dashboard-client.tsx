"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { ExportButton } from "@/components/export-button";
import {
  Package,
  Euro,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Scale,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

const TYPE_META: Record<string, { label: string; badge: string; icon: typeof Scale }> = {
  IN: { label: "Entrée", badge: "bg-emerald-100 text-emerald-700", icon: ArrowDownToLine },
  OUT: { label: "Sortie", badge: "bg-red-100 text-red-700", icon: ArrowUpFromLine },
  ADJUST: { label: "Ajustement", badge: "bg-amber-100 text-amber-700", icon: Scale },
};

const fmt = formatMoney;

export function DashboardClient({
  currency,
  kpis,
  salesByDay,
  stockSplit,
  lowStock,
  recentMovements,
}: {
  currency: string;
  kpis: {
    productCount: number;
    totalUnits: number;
    stockValue: number;
    revenueMonth: number;
    costMonth: number;
    salesCount: number;
    lowStockCount: number;
  };
  salesByDay: { date: string; label: string; total: number }[];
  stockSplit: { name: string; value: number }[];
  lowStock: { id: string; name: string; quantity: number; minStock: number }[];
  recentMovements: {
    id: string;
    type: string;
    quantity: number;
    createdAt: string;
    productName: string;
    note: string | null;
  }[];
}) {
  const cards = [
    {
      label: "Valeur du stock",
      value: fmt(kpis.stockValue, currency),
      sub: `${kpis.totalUnits} unités · ${kpis.productCount} produits`,
      icon: Package,
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      label: "Ventes du mois",
      value: fmt(kpis.revenueMonth, currency),
      sub: `${kpis.salesCount} vente${kpis.salesCount > 1 ? "s" : ""}`,
      icon: TrendingUp,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Achats du mois",
      value: fmt(kpis.costMonth, currency),
      sub: "approvisionnements",
      icon: TrendingDown,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Alertes stock bas",
      value: String(kpis.lowStockCount),
      sub: "produits sous le seuil",
      icon: AlertTriangle,
      color: kpis.lowStockCount > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p className="mt-1 text-sm text-slate-500">
        Vue d&apos;ensemble de votre inventaire et de votre activité.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <ExportButton href="/api/export/stock" label="Exporter le stock" />
        <ExportButton href="/api/export/movements" label="Exporter les mouvements" />
        <ExportButton href="/api/export/sales" label="Exporter les ventes" />
        <ExportButton href="/api/export/purchases" label="Exporter les approvisionnements" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{label}</span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Ventes des 14 derniers jours</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  formatter={(value) => [fmt(Number(value), currency), "Ventes"]}
                  labelStyle={{ color: "#0f172a" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Valeur du stock par produit</h2>
          {stockSplit.length === 0 ? (
            <p className="mt-16 text-center text-sm text-slate-400">
              Aucune donnée — ajoutez des produits.
            </p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockSplit}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {stockSplit.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => fmt(Number(value), currency)}
                    labelStyle={{ color: "#0f172a" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Alertes de stock bas</h2>
            <Link href="/products" className="text-sm text-indigo-600 hover:underline">
              Voir les produits
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-400">
              Aucun produit sous le seuil. 👍
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      Seuil : {p.minStock}
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      p.quantity === 0
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {p.quantity === 0 ? "Rupture" : `${p.quantity} restant${p.quantity > 1 ? "s" : ""}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Derniers mouvements</h2>
            <Link href="/movements" className="text-sm text-indigo-600 hover:underline">
              Tout voir
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-400">
              Aucun mouvement enregistré.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recentMovements.map((m) => {
                const meta = TYPE_META[m.type] ?? TYPE_META.ADJUST;
                const Icon = meta.icon;
                return (
                  <li key={m.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.productName}</p>
                      <p className="truncate text-xs text-slate-400">
                        {new Date(m.createdAt).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {m.note ? ` · ${m.note}` : ""}
                      </p>
                    </div>
                    <span className={`badge ${meta.badge} shrink-0`}>
                      <Icon className="mr-1 h-3 w-3" />
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
