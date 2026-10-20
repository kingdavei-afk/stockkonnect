"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, MessageCircle, Pause, Pencil, Phone, Play, Receipt, Search, ShieldAlert, Trash } from "lucide-react";
import {
  cycleLabel,
  formatAmount,
  paymentMethodLabel,
  paymentStatusBadge,
  planLabel,
} from "@/lib/payments";
import { Modal } from "@/components/ui";
import { PLANS, type PlanId } from "@/lib/plans";
import { formatMoney } from "@/lib/money";
import { AdminPaymentsExport } from "./admin-payments-export";

const fmtAmount = (n: number) => formatMoney(n, "XOF");

type Org = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  plan: string;
  maxUsers: number;
  maxProducts: number | null;
  billingCycle: string | null;
  planEndsAt: string | null;
  trialEndsAt: string | null;
  status: string;
  createdAt: string;
  profit: number;
  ownerName: string | null;
  ownerEmail: string | null;
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
  orgs,
  payments,
  revenue,
}: {
  orgs: Org[];
  payments: Payment[];
  revenue: Revenue;
}) {
  const router = useRouter();
  const [editedOrgs, setEditedOrgs] = useState(orgs);
  const [tab, setTab] = useState<"orgs" | "payments">("orgs");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "PENDING" | "FAILED">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", ownerName: "", ownerEmail: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filteredOrgs = useMemo(
    () =>
      editedOrgs.filter(
        (o) =>
          o.name.toLowerCase().includes(query.toLowerCase()) ||
          o.slug.includes(query.toLowerCase()) ||
          o.phone?.toLowerCase().includes(query.toLowerCase()) ||
          o.email?.toLowerCase().includes(query.toLowerCase())
      ),
    [editedOrgs, query]
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

  const orgCount = orgs.length;

  const totals = editedOrgs.reduce(
    (acc, o) => ({
      active: acc.active + (o.status === "ACTIVE" ? 1 : 0),
      suspended: acc.suspended + (o.status === "SUSPENDED" ? 1 : 0),
      users: acc.users + o._count.users,
      sales: acc.sales + o._count.sales,
      profit: acc.profit + o.profit,
    }),
    { active: 0, suspended: 0, users: 0, sales: 0, profit: 0 }
  );

  function openEditForm(org: Org) {
    setEditError(null);
    setEditForm({
      name: org.name,
      phone: org.phone ?? "",
      email: org.email ?? "",
      ownerName: org.ownerName ?? "",
      ownerEmail: org.ownerEmail ?? "",
    });
    setEditingId(org.id);
  }

  async function saveEdit() {
    if (!editingId) return;
    setEditBusy(true);
    setEditError(null);
    const res = await fetch("/api/admin/orgs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
    });
    setEditBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setEditError(data?.error ?? "Erreur");
      return;
    }
    const data = await res.json().catch(() => null);
    setEditedOrgs((prev) =>
      prev.map((o) =>
        o.id === editingId
          ? {
              ...o,
              name: data?.name ?? o.name,
              phone: data?.phone ?? null,
              email: data?.email ?? null,
              ownerName: data?.owner?.name ?? o.ownerName,
              ownerEmail: data?.owner?.email ?? o.ownerEmail,
            }
          : o
      )
    );
    setEditingId(null);
    router.refresh();
  }

  async function deleteOrg(org: Org) {
    setDeleteBusy(true);
    setDeleteError(null);
    const res = await fetch(`/api/admin/orgs/${org.id}`, {
      method: "DELETE",
    });
    setDeleteBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleteError(data?.error ?? "Erreur");
      return;
    }
    setEditedOrgs((prev) => prev.filter((item) => item.id !== org.id));
    setDeletingId(null);
    router.refresh();
  }

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
    setEditedOrgs((prev) => prev.map((o) => (o.id === org.id ? { ...o, status: next } : o)));
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
    setEditedOrgs((prev) =>
      prev.map((item) =>
        item.id === org.id
          ? {
              ...item,
              plan: data.plan,
              maxUsers: data.maxUsers,
              maxProducts: data.maxProducts,
              billingCycle: data.billingCycle,
              planEndsAt: data.planEndsAt,
              trialEndsAt: data.trialEndsAt,
            }
          : item
      )
    );
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
    if (org.plan === "GRATUIT")
      return new Date(date) > new Date() ? `Essai jusqu'au ${formatted}` : `Essai terminé le ${formatted}`;
    return `Le ${formatted}`;
  }

  function whatsappUrl(org: Org) {
    if (!org.phone) return null;
    const raw = org.phone.trim();
    const digits = raw.replace(/\D/g, "");
    const internationalNumber =
      raw.startsWith("+")
        ? digits
        : digits.startsWith("00")
          ? digits.slice(2)
          : digits.startsWith("225")
            ? digits
            : `225${digits.replace(/^0/, "")}`;
    if (internationalNumber.length < 8) return null;
    const salutation = org.ownerName?.trim()
      ? `Bonjour ${org.ownerName.trim()},`
      : "Bonjour,";
    const message = [
      `${salutation} votre établissement ${org.name} vient d'activer son essai gratuit Stockkonect.`,
      "",
      "Vous avez un accès complet à l'application (caisse, stock, clients, résultats) pendant une période d'essai.",
      "",
      "Pour toute question, contactez le support au +225 07 48323191 pour être accompagné.",
    ].join("\n");
    return `https://wa.me/${internationalNumber}?text=${encodeURIComponent(message)}`;
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
      <div className="mt-6 flex flex-wrap gap-2">
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
        <AdminPaymentsExport orgCount={orgCount} />
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
                  <th>Bénéfices</th>
                  <th>Inscrite le</th>
                  <th>Statut</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrgs.map((o) => {
                  const whatsapp = whatsappUrl(o);
                  return (
                    <tr
                      key={o.id}
                      className={`hover:bg-slate-50 ${o.status === "SUSPENDED" ? "opacity-60" : ""}`}
                    >
                      <td>
                        <p className="flex items-center gap-2 font-medium">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {o.name}
                        </p>
                        <p className="text-xs text-slate-400">{o.slug}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          {o.phone ? (
                            <a href={`tel:${o.phone}`} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
                              <Phone className="h-3 w-3" />
                              {o.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">Téléphone non renseigné</span>
                          )}
                          {o.email ? (
                            <a href={`mailto:${o.email}`} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
                              <Mail className="h-3 w-3" />
                              {o.email}
                            </a>
                          ) : (
                            <span className="text-slate-400">E-mail non renseigné</span>
                          )}
                          {whatsapp && (
                            <a
                              href={whatsapp}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Envoyer le message de bienvenue à ${o.ownerName ?? o.name} via WhatsApp`}
                              title={`Envoyer le message de bienvenue à ${o.ownerName ?? o.name} via WhatsApp`}
                              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </a>
                          )}
                        </div>
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
                          {PLANS.filter((plan) => plan.id !== "GRATUIT").flatMap((plan) => [
                            <option key={`${plan.id}:monthly`} value={`${plan.id}:monthly`}>
                              {planLabel(plan.id)} · mensuel
                            </option>,
                            <option key={`${plan.id}:yearly`} value={`${plan.id}:yearly`}>
                              {planLabel(plan.id)} · annuel
                            </option>,
                          ])}
                        </select>
                      </td>
                      <td className="whitespace-nowrap text-xs text-slate-500">{expirationLabel(o)}</td>
                      <td className="font-mono">{o._count.users} / {o.maxUsers}</td>
                      <td className="font-mono">{o._count.products}</td>
                      <td className="font-mono">{o._count.sales}</td>
                      <td className="font-mono">
                        {o.profit != null ? fmtAmount(o.profit) : "—"}
                      </td>
                      <td className="whitespace-nowrap text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}{" "}
                        à{" "}
                        {new Date(o.createdAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <span
                          className={`badge ${o.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                        >
                          {o.status === "ACTIVE" ? "Active" : "Suspendue"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                            disabled={busyId === o.id || editBusy}
                            onClick={() => openEditForm(o)}
                          >
                            <Pencil className="h-3 w-3" /> Fiche
                          </button>
                          <button
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                            disabled={busyId === o.id || editBusy}
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
                          <button
                            className="btn-danger-dangerous !px-3 !py-1.5 text-xs"
                            disabled={busyId === o.id || editBusy || deletingId === o.id || deleteBusy}
                            onClick={() => setDeletingId(o.id)}
                          >
                            <Trash className="h-3 w-3" /> Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                      <td className="whitespace-nowrap font-semibold">{formatAmount(p.amount)} F CFA</td>
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

      {/* Modal édition de la fiche entreprise + propriétaire */}
      <Modal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        title="Modifier la fiche entreprise"
      >
        {editError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{editError}</div>
        )}
        <div className="mt-3 space-y-3">
          <div>
            <label className="label" htmlFor="edit-org-name">Nom de l&apos;entreprise *</label>
            <input
              id="edit-org-name"
              className="input"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-org-phone">Numéro WhatsApp</label>
            <input
              id="edit-org-phone"
              type="tel"
              className="input"
              value={editForm.phone}
              placeholder="Ex : +225 07 48 32 31 91 (vide pour effacer)"
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-org-email">Email d&apos;entreprise</label>
            <input
              id="edit-org-email"
              type="email"
              className="input"
              value={editForm.email}
              placeholder="vide pour effacer"
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Compte propriétaire
            </p>
            <div>
              <label className="label" htmlFor="edit-owner-name">Nom du propriétaire *</label>
              <input
                id="edit-owner-name"
                className="input"
                value={editForm.ownerName}
                onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
              />
            </div>
            <div className="mt-3">
              <label className="label" htmlFor="edit-owner-email">Email du propriétaire</label>
              <input
                id="edit-owner-email"
                type="email"
                className="input"
                value={editForm.ownerEmail}
                placeholder="vide pour conserver l'email actuel"
                onChange={(e) => setEditForm({ ...editForm, ownerEmail: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setEditingId(null)} disabled={editBusy}>
            Annuler
          </button>
          <button type="button" className="btn-primary" onClick={saveEdit} disabled={editBusy}>
            {editBusy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </Modal>

      {/* Modal de suppression d'une entreprise */}
      <Modal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Supprimer cette entreprise ?"
      >
        {deleteError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</div>
        )}
        <div className="mt-3 space-y-3">
          <p>
            Cette action supprime l&apos;entreprise <strong>{editedOrgs.find((o) => o.id === deletingId)?.name}</strong>
            ainsi que tous ses utilisateurs et données associées.
          </p>
          <p className="text-sm text-slate-500">
            Cette action est irréversible. Assurez-vous que l&apos;entreprise n&apos;est plus utilisée avant de continuer.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setDeletingId(null)}
            disabled={deleteBusy}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn-primary !bg-red-600 !text-white hover:!bg-red-700"
            onClick={() => {
              const org = editedOrgs.find((o) => o.id === deletingId);
              if (org) void deleteOrg(org);
            }}
            disabled={deleteBusy}
          >
            {deleteBusy ? "Suppression…" : "Supprimer cette entreprise"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
