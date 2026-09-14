"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Modal, ConfirmDeleteButton, EmptyState } from "@/components/ui";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  placeholder?: string;
};

type Row = Record<string, string | number | null>;

export function SimpleCrud({
  title,
  description,
  endpoint,
  fields,
  rows,
  nameKey = "name",
  secondaryKey = "email",
}: {
  title: string;
  description: string;
  endpoint: string; // ex: /api/categories
  fields: FieldDef[];
  rows: Row[];
  nameKey?: string;
  secondaryKey?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(Object.fromEntries(fields.map((f) => [f.key, ""])));
    setError(null);
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditingId(String(row.id));
    setForm(
      Object.fromEntries(fields.map((f) => [f.key, String(row[f.key] ?? "")]))
    );
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(
      editingId ? `${endpoint}/${editingId}` : endpoint,
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur d'enregistrement");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={String(row.id)} className="hover:bg-slate-50">
                {fields.map((f, i) => (
                  <td key={f.key} className={i === 0 ? "font-medium" : "text-slate-600"}>
                    {String(row[f.key] ?? "") || "—"}
                  </td>
                ))}
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="btn-secondary !p-2"
                      title="Modifier"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <ConfirmDeleteButton onConfirm={() => handleDelete(String(row.id))} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {rows.length === 0 && (
          <EmptyState message={`Aucun élément. Cliquez sur « Ajouter » pour commencer.`} />
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Modifier" : `Nouvel élément`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          {fields.map((f) => (
            <div key={f.key}>
              <label className="label">
                {f.label}
                {f.required ? " *" : ""}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  className="input"
                  rows={2}
                  value={form[f.key] ?? ""}
                  placeholder={f.placeholder}
                  required={f.required}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  className="input"
                  type={f.type ?? "text"}
                  value={form[f.key] ?? ""}
                  placeholder={f.placeholder}
                  required={f.required}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
