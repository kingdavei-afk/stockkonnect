"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Scale, Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { ExportButton } from "@/components/export-button";

type ProductOption = { id: string; name: string; sku: string; quantity: number };

type Movement = {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  createdAt: string | Date;
  product: { name: string; sku: string };
};

const TYPE_META: Record<string, { label: string; badge: string; icon: typeof Scale }> = {
  IN: { label: "Entrée", badge: "bg-emerald-100 text-emerald-700", icon: ArrowDownToLine },
  OUT: { label: "Sortie", badge: "bg-red-100 text-red-700", icon: ArrowUpFromLine },
  ADJUST: { label: "Ajustement", badge: "bg-amber-100 text-amber-700", icon: Scale },
};

export function MovementsClient({
  products,
  movements,
}: {
  products: ProductOption[];
  movements: Movement[];
}) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = products.find((p) => p.id === productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) {
      setError("Sélectionnez un produit");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        type,
        quantity: Number(quantity),
        note: note || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur d'enregistrement");
      return;
    }
    setQuantity("1");
    setNote("");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Mouvements de stock</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enregistrez les entrées, sorties et ajustements d&apos;inventaire.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="card h-fit p-6">
          <h2 className="font-semibold">Nouveau mouvement</h2>
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Produit</label>
              <select
                className="input"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">— Choisir un produit —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.quantity} en stock)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(["IN", "OUT", "ADJUST"] as const).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`btn flex flex-col items-center gap-1 border py-3 text-xs ${
                        type === t
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">
                {type === "ADJUST" ? "Correction (± delta)" : "Quantité"}
              </label>
              <input
                type="number"
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={type === "ADJUST" ? undefined : 1}
                required
              />
              {selected && type !== "ADJUST" && (
                <p className="mt-1 text-xs text-slate-500">
                  Stock actuel : {selected.quantity} →{" "}
                  {type === "IN"
                    ? selected.quantity + Number(quantity || 0)
                    : selected.quantity - Number(quantity || 0)}
                </p>
              )}
              {selected && type === "ADJUST" && (
                <p className="mt-1 text-xs text-slate-500">
                  Stock actuel : {selected.quantity} →{" "}
                  {selected.quantity + Number(quantity || 0)}
                </p>
              )}
            </div>
            <div>
              <label className="label">Note (optionnel)</label>
              <input
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex : réception commande #123"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={saving || !productId}>
              {saving ? "Enregistrement…" : "Enregistrer le mouvement"}
            </button>
          </div>
        </form>

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold">Historique</h2>
            <ExportButton href="/api/export/movements" label="Exporter" />
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Type</th>
                <th>Quantité</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((m) => {
                const meta = TYPE_META[m.type] ?? TYPE_META.ADJUST;
                const Icon = meta.icon;
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap text-slate-500">
                      {new Date(m.createdAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td>
                      <p className="font-medium">{m.product.name}</p>
                      <p className="text-xs text-slate-400">{m.product.sku}</p>
                    </td>
                    <td>
                      <span className={`badge ${meta.badge}`}>
                        <Icon className="mr-1 h-3 w-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="font-mono">
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="text-slate-500">{m.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {movements.length === 0 && (
            <EmptyState message="Aucun mouvement enregistré pour le moment." />
          )}
        </div>
      </div>
    </div>
  );
}
