"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Printer, PackageX } from "lucide-react";
import { Modal, ConfirmDeleteButton, EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { ExportButton } from "@/components/export-button";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;
  image: string | null;
  categoryId: string | null;
  supplierId: string | null;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
};

type Option = { id: string; name: string };

type FormState = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  cost: string;
  quantity: string;
  minStock: string;
  image: string;
  categoryId: string;
  supplierId: string;
};

const emptyForm: FormState = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  price: "",
  cost: "",
  quantity: "0",
  minStock: "5",
  image: "",
  categoryId: "",
  supplierId: "",
};

const fmt = formatMoney;

export function ProductsClient({
  products,
  categories,
  suppliers,
  currency,
}: {
  products: Product[];
  categories: Option[];
  suppliers: Option[];
  currency: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  const lowStockCount = products.filter((p) => p.quantity <= p.minStock).length;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? "",
      description: p.description ?? "",
      price: String(p.price),
      cost: String(p.cost),
      quantity: String(p.quantity),
      minStock: String(p.minStock),
      image: p.image ?? "",
      categoryId: p.categoryId ?? "",
      supplierId: p.supplierId ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Échec de l'upload");
      return null;
    }
    const data = await res.json();
    return data.url as string;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      quantity: Number(form.quantity) || 0,
      minStock: Number(form.minStock) || 0,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      image: form.image || null,
    };
    const res = await fetch(
      editing ? `/api/products/${editing.id}` : "/api/products",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur d'enregistrement");
      return;
    }
    setModalOpen(false);
    router.refresh();
  }

  async function handleDelete(p: Product) {
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="mt-1 text-sm text-slate-500">
            {products.length} produit{products.length > 1 ? "s" : ""}
            {lowStockCount > 0 && (
              <span className="ml-2 font-medium text-amber-600">
                · {lowStockCount} en stock bas
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Rechercher (nom, SKU, code-barres)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ExportButton href="/api/export/stock" />
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau produit
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th>Produit</th>
              <th>SKU</th>
              <th>Catégorie</th>
              <th>Prix</th>
              <th>Stock</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const low = p.quantity <= p.minStock;
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td>
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <PackageX className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{p.name}</p>
                        {p.barcode && (
                          <p className="text-xs text-slate-400">{p.barcode}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>{p.category?.name ?? "—"}</td>
                  <td>{fmt(p.price, currency)}</td>
                  <td>
                    <span
                      className={`badge ${
                        low
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {p.quantity} unité{p.quantity > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="btn-secondary !p-2"
                        title="Étiquette code-barres"
                        onClick={() => setLabelProduct(p)}
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        className="btn-secondary !p-2"
                        title="Modifier"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <ConfirmDeleteButton onConfirm={() => handleDelete(p)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState message="Aucun produit trouvé. Créez votre premier produit !" />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier le produit" : "Nouveau produit"}
        wide
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">SKU *</label>
              <input
                className="input font-mono"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Code-barres</label>
              <input
                className="input"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="Optionnel"
              />
            </div>
            <div>
              <label className="label">Catégorie</label>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">— Aucune —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prix de vente ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Coût d&apos;achat ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
            {!editing && (
              <div>
                <label className="label">Quantité initiale</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="label">Seuil d&apos;alerte</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Fournisseur</label>
              <select
                className="input"
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              >
                <option value="">— Aucun —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Photo du produit</label>
            <div className="flex items-center gap-4">
              {form.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.image}
                  alt="Aperçu"
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  Aucune
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await uploadImage(file);
                    if (url) setForm((f) => ({ ...f, image: url }));
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileRef.current?.click()}
              >
                Choisir une image
              </button>
              {form.image && (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => setForm({ ...form, image: "" })}
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {labelProduct && (
        <BarcodeLabel product={labelProduct} onClose={() => setLabelProduct(null)} />
      )}
    </div>
  );
}

function BarcodeLabel({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Étiquette</h2>
          <button className="btn-secondary !p-2" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div id="label-print" className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
          <p className="font-semibold">{product.name}</p>
          <p className="text-xs text-slate-500">{product.sku}</p>
          {product.barcode ? (
            <img
              src={`https://barcodeapi.org/api/128/${encodeURIComponent(product.barcode)}`}
              alt={`Code-barres ${product.barcode}`}
              className="mx-auto mt-2 h-16"
            />
          ) : (
            <p className="mt-2 text-xs text-slate-400">
              Aucun code-barres défini pour ce produit.
            </p>
          )}
          {product.barcode && (
            <p className="mt-1 font-mono text-xs tracking-widest">{product.barcode}</p>
          )}
        </div>
        <button
          className="btn-primary mt-4 w-full"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </button>
      </div>
    </div>
  );
}
