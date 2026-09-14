"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pause, Play, Search, ShieldAlert } from "lucide-react";

type Org = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  maxUsers: number;
  status: string;
  createdAt: string;
  _count: { users: number; products: number; sales: number };
};

export function AdminClient({ orgs: initial }: { orgs: Org[] }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState(initial);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(query.toLowerCase()) ||
      o.slug.includes(query.toLowerCase())
  );

  const totals = orgs.reduce(
    (acc, o) => ({
      active: acc.active + (o.status === "ACTIVE" ? 1 : 0),
      suspended: acc.suspended + (o.status === "SUSPENDED" ? 1 : 0),
      users: acc.users + o._count.users,
      sales: acc.sales + o._count.sales,
    }),
    { active: 0, suspended: 0, users: 0, sales: 0 }
  );

  async function toggleStatus(org: Org) {
    setBusyId(org.id);
    setError(null);
    const next = org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const res = await fetch("/api/admin/orgs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: org.id, status: next }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur");
      return;
    }
    setOrgs((prev) => prev.map((o) => (o.id === org.id ? { ...o, status: next } : o)));
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldAlert className="h-6 w-6 text-indigo-600" />
            Console Super-Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vue plateforme — toutes les entreprises inscrites sur StockFlow.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher une entreprise…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Entreprises actives", value: totals.active },
          { label: "Entreprises suspendues", value: totals.suspended },
          { label: "Utilisateurs (total)", value: totals.users },
          { label: "Ventes (total)", value: totals.sales },
        ].map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th>Entreprise</th>
                <th>Plan</th>
                <th>Utilisateurs</th>
                <th>Produits</th>
                <th>Ventes</th>
                <th>Inscrite le</th>
                <th>Statut</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => (
                <tr key={o.id} className={`hover:bg-slate-50 ${o.status === "SUSPENDED" ? "opacity-60" : ""}`}>
                  <td>
                    <p className="flex items-center gap-2 font-medium">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {o.name}
                    </p>
                    <p className="text-xs text-slate-400">{o.slug}</p>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        o.plan === "PRO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {o.plan === "PRO" ? "Pro" : "Gratuit"}
                    </span>
                  </td>
                  <td className="font-mono">
                    {o._count.users} / {o.maxUsers}
                  </td>
                  <td className="font-mono">{o._count.products}</td>
                  <td className="font-mono">{o._count.sales}</td>
                  <td className="whitespace-nowrap text-slate-500">
                    {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        o.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {o.status === "ACTIVE" ? "Active" : "Suspendue"}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                      disabled={busyId === o.id}
                      onClick={() => toggleStatus(o)}
                    >
                      {o.status === "ACTIVE" ? (
                        <>
                          <Pause className="h-3 w-3" /> Suspendre
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" /> Réactiver
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
