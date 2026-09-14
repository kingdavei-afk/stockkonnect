"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { Modal, EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/money";

export type ProductLine = {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  quantity: number;
};

type Line = { productId: string; quantity: string };

export function DocumentForm({
  endpoint,
  currency,
  useCost,
  products,
  partners,
  partnerLabel,
  title,
  createLabel,
}: {
  endpoint: string;
  currency: string;
  useCost?: boolean;
  products: ProductLine[];
  partners: { id: string; name: string }[];
  partnerLabel: string;
  title: string;
  createLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addLine() {
    setLines([...lines, { productId: "", quantity: "1" }]);
  }

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function lineTotal(l: Line) {
    const p = products.find((p) => p.id === l.productId);
    if (!p) return 0;
    const unit = useCost ? p.cost : p.price;
    return unit * (Number(l.quantity) || 0);
  }

  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId: partnerId || null,
        items: lines
          .filter((l) => l.productId)
          .map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity) || 0,
          })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur d'enregistrement");
      return;
    }
    setOpen(false);
    setLines([{ productId: "", quantity: "1" }]);
    setPartnerId("");
    router.refresh();
  }

  return (
    <>
      <button className="btn-primary w-full sm:w-auto" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {createLabel}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="label">{partnerLabel}</label>
            <select
              className="input"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value="">— Aucun —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="label">Articles</label>
            {lines.map((l, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select
                  className="input min-w-[160px] flex-1 basis-full sm:basis-auto"
                  value={l.productId}
                  onChange={(e) => updateLine(idx, { productId: e.target.value })}
                  required
                >
                  <option value="">— Choisir un produit —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.quantity} en stock)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="input w-20"
                  value={l.quantity}
                  onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                  required
                />
                <span className="ml-auto text-sm text-slate-500">
                  {formatMoney(lineTotal(l), currency)}
                </span>
                <button
                  type="button"
                  className="btn-secondary !p-2"
                  onClick={() => removeLine(idx)}
                  aria-label="Retirer la ligne"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addLine}>
              <Plus className="h-4 w-4" />
              Ajouter un article
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="font-medium">Total</span>
            <span className="text-lg font-bold">
              {formatMoney(grandTotal, currency)}
            </span>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <ShoppingCart className="h-4 w-4" />
              {saving ? "Enregistrement…" : "Valider"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
