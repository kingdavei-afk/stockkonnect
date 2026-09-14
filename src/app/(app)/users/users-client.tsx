"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, Trash2, Pencil, ShieldCheck, Shield } from "lucide-react";
import { Modal, ConfirmDeleteButton, EmptyState } from "@/components/ui";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

const emptyForm = { name: "", email: "", password: "", role: "STAFF" };

export function UsersClient({
  users: initialUsers,
  currentUserId,
  maxUsers,
  plan,
}: {
  users: UserRow[];
  currentUserId: string;
  maxUsers: number;
  plan: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setError(null);
    setOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = editing
      ? {
          id: editing.id,
          name: form.name,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        }
      : { name: form.name, email: form.email, password: form.password, role: form.role };

    const res = await fetch("/api/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Erreur d'enregistrement");
      return;
    }
    setOpen(false);
    setUsers((prev) =>
      editing
        ? prev.map((u) => (u.id === editing.id ? data : u))
        : [...prev, data]
    );
    router.refresh();
  }

  async function handleDelete(u: UserRow) {
    const res = await fetch(`/api/users?id=${u.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Suppression impossible");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="mt-1 text-sm text-slate-500">
            {users.length} / {maxUsers} du plan {plan === "PRO" ? "Pro" : "Gratuit"} — les employés
            ne peuvent pas gérer les utilisateurs ni les paramètres.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate} disabled={users.length >= maxUsers}>
          <Plus className="h-4 w-4" />
          Inviter un utilisateur
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <input
            className="input"
            placeholder="Rechercher (nom, email)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Créé le</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="font-medium">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-xs text-slate-400">(vous)</span>
                    )}
                  </td>
                  <td className="text-slate-500">{u.email}</td>
                  <td>
                    <span
                      className={`badge ${
                        u.role === "ADMIN"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role === "ADMIN" ? (
                        <ShieldCheck className="mr-1 h-3 w-3" />
                      ) : (
                        <Shield className="mr-1 h-3 w-3" />
                      )}
                      {u.role === "ADMIN" ? "Administrateur" : "Employé"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        className="text-sm font-medium text-indigo-600 hover:underline"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="mr-1 inline h-3 w-3" />
                        Modifier
                      </button>
                      {u.id !== currentUserId && (
                        <ConfirmDeleteButton onConfirm={() => handleDelete(u)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState message="Aucun utilisateur trouvé." />}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier l'utilisateur" : "Inviter un utilisateur"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="label">Nom complet</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          {!editing && (
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          )}
          <div>
            <label className="label">
              {editing ? "Nouveau mot de passe (laisser vide pour ne rien changer)" : "Mot de passe"}
            </label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={editing ? 0 : 6}
              required={!editing}
              placeholder={editing ? "••••••••" : "6 caractères minimum"}
            />
          </div>
          <div>
            <label className="label">Rôle</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="STAFF">Employé</option>
              <option value="ADMIN">Administrateur</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Les administrateurs gèrent utilisateurs, paramètres et toute l&apos;app.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <UserPlus className="h-4 w-4" />
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le compte"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
