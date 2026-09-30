"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pause, Play, Receipt, Search, ShieldAlert } from "lucide-react";
import {
  cycleLabel,
  formatAmount,
  paymentMethodLabel,
  paymentStatusBadge,
  planLabel,
} from "@/lib/payments";
import { PLANS, type PlanId } from "@/lib/plans";

type Org = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  maxUsers: number;
  maxProducts: number | null;
  billingCycle: string | null;
  planEndsAt: string | null;
  trialEndsAt: string | null;
  status: string;
  createdAt: string;
  _count: { users: number; products: number; sales: number };
};

type Payment = {
  id: string;
  transactionId: string;
  orgName: string;
  amount: number;
  cycle: string;
  planId: string;
  status: string;
  method: string | null;
  paidAt: string;
};

type Revenue = {
  total: number;
  count: number;
  last30d: number;
  count30d: number;
  byPlan: { planId: string | null; amount: number; count: number }[];
  byMethod: { method: string | null; amount: number; count: number }[];
};

export function AdminClient({
  orgs: initial,
  payments,
  revenue,
}: {
  orgs: Org[];
  payments: Payment[];
  revenue: Revenue;
}) {
  const router = useRouter();
  const [orgs, setOrgs] = useState(initial);
  const [tab, setTab] = useState<"orgs" | "payments">("orgs");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "PENDING" | "FAILED">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredOrgs = useMemo(
    () =>
      orgs.filter(
        (o) =>
          o.name.toLowerCase().includes(query.toLowerCase()) ||
          o.slug.includes(query.toLowerCase())
      ),
    [orgs, query]
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter((p) => {
        if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
        const q = query.toLowerCase();
        return (
          p.transactionId.toLowerCase().includes(q) ||
          p.orgName.toLowerCase().includes(q)
        );
      }),
    [payments, statusFilter, query]
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

  async function assignPlan(org: Org, planId: PlanId, billingCycle?: "monthly" | "yearly") {
    if (org.plan === planId && (planId === "GRATUIT" || org.billingCycle === billingCycle)) return;
    setBusyId(org.id);
    setError(null);
    const res = await fetch("/api/admin/orgs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: org.id, planId, billingCycle }),
    });
    const data = await res.json().catch(() => null);
    setBusyId(null);
    if (!res.ok) {
      setError(data?.error ?? "Impossible de modifier le plan");
      return;
    }
    setOrgs((prev) => prev.map((item) => item.id === org.id
      ? {
          ...item,
          plan: data.plan,
          maxUsers: data.maxUsers,
          maxProducts: data.maxProducts,
          billingCycle: data.billingCycle,
          planEndsAt: data.planEndsAt,
          trialEndsAt: data.trialEndsAt,
        }
      : item));
    router.refresh();
  }

  function handlePlanChange(org: Org, value: string) {
    if (value === "GRATUIT") {
      void assignPlan(org, "GRATUIT");
      return;
    }
    const [planId, billingCycle] = value.split(":") as [PlanId, "monthly" | "yearly"];
    void assignPlan(org, planId, billingCycle);
  }

  function expirationLabel(org: Org) {
    const date = org.plan === "GRATUIT" ? org.trialEndsAt : org.planEndsAt;
    if (!date) return "—";
    const formatted = new Date(date).toLocaleDateString("fr-FR");
    if (org.plan === "GRATUIT") return new Date(date) > new Date() ? `Essai jusqu’au ${formatted}` : `Essai terminé le ${formatted}`;
    return `Le ${formatted}`;
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
            Vue plateforme — toutes les entreprises inscrites sur Stockkonect.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Cartes de revenus */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Revenus encaissés (total)</p>
          <p className="mt-1 text-2xl font-bold">{formatAmount(revenue.total)} F CFA</p>
          <p className="text-xs text-slate-400">{revenue.count} paiement(s)</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Revenus 30 derniers jours</p>
          <p className="mt-1 text-2xl font-bold">{formatAmount(revenue.last30d)} F CFA</p>
          <p className="text-xs text-slate-400">{revenue.count30d} paiement(s)</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Par offre</p>
          {revenue.byPlan.length === 0 ? (
            <p className="mt-1 text-sm text-slate-400">—</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-sm">
              {revenue.byPlan.map((g) => (
                <li key={g.planId ?? "?"} className="flex justify-between gap-2">
                  <span>{planLabel(g.planId)}</span>
                  <span className="font-semibold">{formatAmount(g.amount)} F</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Par moyen de paiement</p>
          {revenue.byMethod.length === 0 ? (
            <p className="mt-1 text-sm text-slate-400">—</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-sm">
              {revenue.byMethod.map((g) => (
                <li key={g.method ?? "?"} className="flex justify-between gap-2">
                  <span>{paymentMethodLabel(g.method)}</span>
                  <span className="font-semibold">{formatAmount(g.amount)} F</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("orgs")}
          className={`btn-secondary !px-4 !py-2 text-sm ${tab === "orgs" ? "!bg-slate-900 !text-white" : ""}`}
        >
          <Building2 className="h-4 w-4" />
          Entreprises ({totals.active + totals.suspended})
        </button>
        <button
          type="button"
          onClick={() => setTab("payments")}
          className={`btn-secondary !px-4 !py-2 text-sm ${tab === "payments" ? "!bg-slate-900 !text-white" : ""}`}
        >
          <Receipt className="h-4 w-4" />
          Paiements ({payments.length})
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {tab === "orgs" ? (
        <div className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th>Entreprise</th>
                  <th>Plan</th>
                  <th>Expiration</th>
                  <th>Utilisateurs</th>
                  <th>Produits</th>
                  <th>Ventes</th>
                  <th>Inscrite le</th>
                  <th>Statut</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrgs.map((o) => (
                  <tr key={o.id} className={`hover:bg-slate-50 ${o.status === "SUSPENDED" ? "opacity-60" : ""}`}>
                    <td>
                      <p className="flex items-center gap-2 font-medium">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {o.name}
                      </p>
                      <p className="text-xs text-slate-400">{o.slug}</p>
                    </td>
                    <td>
                      <select
                        className="input min-w-32 !py-1.5 text-xs"
                        value={o.plan === "GRATUIT" ? "GRATUIT" : `${o.plan}:${o.billingCycle ?? "monthly"}`}
                        disabled={busyId === o.id}
                        aria-label={`Plan de ${o.name}`}
                        onChange={(event) => handlePlanChange(o, event.target.value)}
                      >
                        <option value="GRATUIT">Gratuit · essai de 7 jours</option>
                        {PLANS.filter((plan) => plan.id !== "GRATUIT").flatMap((plan) => ([
                          <option key={`${plan.id}:monthly`} value={`${plan.id}:monthly`}>{planLabel(plan.id)} · mensuel</option>,
                          <option key={`${plan.id}:yearly`} value={`${plan.id}:yearly`}>{planLabel(plan.id)} · annuel</option>,
                        ]))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{expirationLabel(o)}</td>
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
      ) : (
        <div className="card mt-4 overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
            {(["ALL", "SUCCESS", "PENDING", "FAILED"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s === "ALL" ? "Tous" : paymentStatusBadge(s).label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th>Transaction</th>
                  <th>Entreprise</th>
                  <th>Offre</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Méthode</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                      Aucun paiement
                    </td>
                  </tr>
                )}
                {filteredPayments.map((p) => {
                  const badge = paymentStatusBadge(p.status);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs">{p.transactionId}</td>
                      <td className="font-medium">{p.orgName}</td>
                      <td>
                        <span className="badge bg-slate-100 text-slate-600">
                          {planLabel(p.planId)}
                          {cycleLabel(p.cycle) ? ` · ${cycleLabel(p.cycle)}` : ""}
                        </span>
                      </td>
                      <td className="whitespace-nowrap font-semibold">
                        {formatAmount(p.amount)} F CFA
                      </td>
                      <td>
                        <span className={`badge ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="text-slate-500">{paymentMethodLabel(p.method)}</td>
                      <td className="whitespace-nowrap text-slate-500">
                        {new Date(p.paidAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
