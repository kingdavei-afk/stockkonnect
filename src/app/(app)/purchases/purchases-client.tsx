"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { DocumentForm } from "@/components/document-form";
import { ExportButton } from "@/components/export-button";
import { EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/money";

type Purchase = {
  id: string;
  reference: string;
  status: string;
  total: number;
  createdAt: string | Date;
  supplier?: { name: string } | null;
  items: { id: string; quantity: number; unitCost: number; product: { name: string } }[];
};

export function PurchasesClient({
  purchases,
  products,
  suppliers,
  currency,
}: {
  purchases: Purchase[];
  products: { id: string; name: string; sku: string; price: number; cost: number; quantity: number }[];
  suppliers: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();

  const fmt = (n: number) => formatMoney(n, currency);

  async function cancelPurchase(id: string) {
    if (!confirm("Annuler cet approvisionnement ? Le stock sera décrémenté.")) return;
    const res = await fetch(`/api/purchases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Approvisionnements</h1>
          <p className="mt-1 text-sm text-slate-500">
            Réceptionnez les marchandises — le stock est incrémenté automatiquement.
          </p>
        </div>
        <ExportButton href="/api/export/purchases" />
        <DocumentForm
          endpoint="/api/purchases"
          currency={currency}
          useCost
          products={products}
          partners={suppliers}
          partnerLabel="Fournisseur (optionnel)"
          title="Nouvel approvisionnement"
          createLabel="Réceptionner du stock"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th>Référence</th>
              <th>Date</th>
              <th>Fournisseur</th>
              <th>Articles</th>
              <th>Total</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="font-mono text-xs">{p.reference}</td>
                <td className="whitespace-nowrap text-slate-500">
                  {new Date(p.createdAt).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td>{p.supplier?.name ?? "—"}</td>
                <td className="text-slate-500">
                  {p.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
                </td>
                <td className="font-semibold">{fmt(p.total)}</td>
                <td>
                  <span
                    className={`badge ${
                      p.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {p.status === "COMPLETED" ? "Terminé" : "Annulé"}
                  </span>
                </td>
                <td>
                  <div className="flex items-center justify-end">
                    {p.status === "COMPLETED" && (
                      <button
                        className="btn-secondary !p-2"
                        title="Annuler"
                        onClick={() => cancelPurchase(p.id)}
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
        {purchases.length === 0 && (
          <EmptyState message="Aucun approvisionnement enregistré." />
        )}
      </div>
    </div>
  );
}
