"use client";

import { useRouter } from "next/navigation";
import { Ban, TrendingUp } from "lucide-react";
import { DocumentForm } from "@/components/document-form";
import { EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { SalesExportButton } from "@/components/export-button";

type Sale = {
  id: string;
  reference: string;
  status: string;
  total: number;
  createdAt: string | Date;
  customer?: { name: string } | null;
  items: { id: string; quantity: number; unitPrice: number; product: { name: string } }[];
};

export function SalesClient({
  sales,
  products,
  customers,
  currency,
}: {
  sales: Sale[];
  products: { id: string; name: string; sku: string; price: number; cost: number; quantity: number }[];
  customers: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();

  const fmt = (n: number) => formatMoney(n, currency);

  async function cancelSale(id: string) {
    if (!confirm("Annuler cette vente ? Le stock sera restauré.")) return;
    const res = await fetch(`/api/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    if (res.ok) router.refresh();
  }

  const todayRevenue = sales
    .filter(
      (s) =>
        s.status === "COMPLETED" &&
        new Date(s.createdAt).toDateString() === new Date().toDateString()
    )
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ventes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enregistrez vos ventes — le stock est décrémenté automatiquement.
          </p>
        </div>
        <SalesExportButton />
        <DocumentForm
          endpoint="/api/sales"
          currency={currency}
          products={products}
          partners={customers}
          partnerLabel="Client (optionnel)"
          title="Nouvelle vente"
          createLabel="Nouvelle vente"
        />
      </div>

      <div className="card mb-6 flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">Chiffre d&apos;affaires du jour</p>
          <p className="text-lg font-bold">{fmt(todayRevenue)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th>Référence</th>
              <th>Date</th>
              <th>Client</th>
              <th>Articles</th>
              <th>Total</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="font-mono text-xs">{s.reference}</td>
                <td className="whitespace-nowrap text-slate-500">
                  {new Date(s.createdAt).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td>{s.customer?.name ?? "—"}</td>
                <td className="text-slate-500">
                  {s.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
                </td>
                <td className="font-semibold">{fmt(s.total)}</td>
                <td>
                  <span
                    className={`badge ${
                      s.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {s.status === "COMPLETED" ? "Terminée" : "Annulée"}
                  </span>
                </td>
                <td>
                  <div className="flex items-center justify-end">
                    {s.status === "COMPLETED" && (
                      <button
                        className="btn-secondary !p-2"
                        title="Annuler la vente"
                        onClick={() => cancelSale(s.id)}
                      >
                        <Ban className="h-4 w-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {sales.length === 0 && (
          <EmptyState message="Aucune vente enregistrée. Créez votre première vente !" />
        )}
      </div>
    </div>
  );
}
