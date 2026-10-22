"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Printer, Trash2, FileText } from "lucide-react";
import { Modal, ConfirmDeleteButton, EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { PrintableInvoice, CompanyInfo } from "@/components/printable-invoice";

type QuoteItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: { name: string; sku: string };
};

type Quote = {
  id: string;
  reference: string;
  status: string;
  total: number;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  customerId: string | null;
  customer?: { name: string } | null;
  items: QuoteItem[];
};

type Product = { id: string; name: string; sku: string; price: number; quantity: number };

type Line = { productId: string; quantity: string; unitPrice: string };

const STATUS_META: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: "Brouillon", badge: "bg-slate-100 text-slate-600" },
  SENT: { label: "Envoyé", badge: "bg-indigo-100 text-indigo-700" },
  ACCEPTED: { label: "Accepté", badge: "bg-emerald-100 text-emerald-700" },
  DECLINED: { label: "Refusé", badge: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expiré", badge: "bg-amber-100 text-amber-700" },
};

const emptyLines: Line[] = [{ productId: "", quantity: "1", unitPrice: "" }];

export function QuotesClient({
  quotes,
  products,
  customers,
  currency,
  company,
}: {
  quotes: Quote[];
  products: Product[];
  customers: { id: string; name: string }[];
  currency: string;
  company: CompanyInfo;
}) {
  const router = useRouter();
  const fmt = (n: number) => formatMoney(n, currency);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>(emptyLines);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Quote | null>(null);

  function openCreate() {
    setEditing(null);
    setCustomerId("");
    setLines(emptyLines);
    setNotes("");
    setValidUntil("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(q: Quote) {
    setEditing(q);
    setCustomerId(q.customerId ?? "");
    setLines(
      q.items.map((i) => ({
        productId: i.productId,
        quantity: String(i.quantity),
        unitPrice: String(i.unitPrice),
      }))
    );
    setNotes(q.notes ?? "");
    setValidUntil(q.validUntil ? q.validUntil.slice(0, 10) : "");
    setError(null);
    setModalOpen(true);
  }

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function selectProduct(idx: number, productId: string) {
    const p = products.find((p) => p.id === productId);
    setLines(
      lines.map((l, i) =>
        i === idx
          ? { ...l, productId, unitPrice: p ? String(p.price) : l.unitPrice }
          : l
      )
    );
  }

  const grandTotal = lines.reduce(
    (s, l) => s + (Number(l.unitPrice) || 0) * (Number(l.quantity) || 0),
    0
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      customerId: customerId || null,
      notes: notes || null,
      validUntil: validUntil || null,
      items: lines
        .filter((l) => l.productId)
        .map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity) || 0,
          unitPrice: Number(l.unitPrice) || 0,
        })),
    };
    const res = await fetch(editing ? `/api/quotes/${editing.id}` : "/api/quotes", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur d'enregistrement");
      return;
    }
    setModalOpen(false);
    router.refresh();
  }

  async function setStatus(q: Quote, status: string) {
    const res = await fetch(`/api/quotes/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  async function handleDelete(q: Quote) {
    const res = await fetch(`/api/quotes/${q.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Devis</h1>
          <p className="mt-1 text-sm text-slate-500">
            {quotes.length} devis · proposez vos prix avant la vente.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau devis
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] divide-y divide-slate-200">
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
              {quotes.map((q) => {
                const meta = STATUS_META[q.status] ?? STATUS_META.DRAFT;
                return (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="font-mono text-xs">{q.reference}</td>
                    <td className="whitespace-nowrap text-slate-500">
                      {new Date(q.createdAt).toLocaleDateString("fr-FR", {
                        dateStyle: "short",
                      })}
                      {q.validUntil && (
                        <span className="block text-xs text-slate-400">
                          valide jusqu&apos;au{" "}
                          {new Date(q.validUntil).toLocaleDateString("fr-FR", {
                            dateStyle: "short",
                          })}
                        </span>
                      )}
                    </td>
                    <td>{q.customer?.name ?? "—"}</td>
                    <td className="text-slate-500">
                      {q.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
                    </td>
                    <td className="font-semibold">{fmt(q.total)}</td>
                    <td>
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {q.status === "DRAFT" && (
                          <button
                            className="text-xs font-medium text-indigo-600 hover:underline"
                            onClick={() => setStatus(q, "SENT")}
                          >
                            Marquer envoyé
                          </button>
                        )}
                        {q.status === "SENT" && (
                          <>
                            <button
                              className="text-xs font-medium text-emerald-600 hover:underline"
                              onClick={() => setStatus(q, "ACCEPTED")}
                            >
                              Accepté
                            </button>
                            <button
                              className="text-xs font-medium text-red-600 hover:underline"
                              onClick={() => setStatus(q, "DECLINED")}
                            >
                              Refusé
                            </button>
                          </>
                        )}
                        <button
                          className="btn-secondary !p-2"
                          title="Imprimer le devis"
                          onClick={() => setInvoice(q)}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-secondary !p-2"
                          title="Modifier"
                          onClick={() => openEdit(q)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <ConfirmDeleteButton onConfirm={() => handleDelete(q)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {quotes.length === 0 && (
          <EmptyState message="Aucun devis. Créez votre premier devis pour proposer vos prix." />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Modifier le devis ${editing.reference}` : "Nouveau devis"}
        wide
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Client</label>
              <select
                className="input"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">— Aucun —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Valide jusqu&apos;au</label>
              <input
                type="date"
                className="input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Articles</label>
            {lines.map((l, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select
                  className="input min-w-[150px] flex-1 basis-full sm:basis-auto"
                  value={l.productId}
                  onChange={(e) => selectProduct(idx, e.target.value)}
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
                  title="Quantité"
                  value={l.quantity}
                  onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input w-28"
                  title="Prix unitaire"
                  placeholder="Prix"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="btn-secondary !p-2"
                  onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                  aria-label="Retirer la ligne"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setLines([...lines, { productId: "", quantity: "1", unitPrice: "" }])}
            >
              <Plus className="h-4 w-4" />
              Ajouter un article
            </button>
          </div>

          <div>
            <label className="label">Notes (conditions, remises…)</label>
            <textarea
              className="input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="font-medium">Total du devis</span>
            <span className="text-lg font-bold">{fmt(grandTotal)}</span>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <FileText className="h-4 w-4" />
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {invoice && (
        <PrintableInvoice
          title="Devis"
          reference={invoice.reference}
          date={invoice.createdAt}
          company={company}
          customerName={invoice.customer?.name ?? null}
          lines={invoice.items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))}
          total={invoice.total}
          currency={currency}
          statusLabel={
            invoice.validUntil
              ? `Valider avant le ${new Date(invoice.validUntil).toLocaleDateString("fr-FR")}`
              : undefined
          }
          validUntil={invoice.validUntil}
          notes={invoice.notes}
          onClose={() => setInvoice(null)}
        />
      )}
    </div>
  );
}
