"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, Sparkles, X } from "lucide-react";
import { Modal } from "@/components/ui";
import { PLANS, type Plan } from "@/lib/plans";

const PAYMENT_METHODS = [
  { id: "orange-money", label: "Orange Money", hint: "+225 07 48 32 31 91" },
  { id: "wave", label: "Wave", hint: "+225 07 48 32 31 91" },
  { id: "mtn-money", label: "MTN Money", hint: "+225 05 04 48 32 31" },
  { id: "card", label: "Carte bancaire", hint: "Visa / Mastercard" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

export function PlansClient({
  isAdmin,
  currentPlan,
  currentCycle,
  userCount,
  currency,
}: {
  isAdmin: boolean;
  currentPlan: string;
  currentCycle: "monthly" | "yearly" | null;
  userCount: number;
  currency: string;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("orange-money");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fmt = (n: number) => (n === 0 ? "Gratuit" : `${n.toLocaleString("fr-FR")} F CFA`);
  const fmtProducts = (n: number | null) => (n === null ? "Produits illimités" : `${n} produits`);

  async function activate() {
    if (!checkout) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: checkout.id, cycle, paymentMethod: method }),
    });
    setBusy(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Échec du paiement");
      return;
    }
    setCheckout(null);
    setSuccess(`Abonnement ${data.plan} activé — ${fmt(data.amountPaid)} payés via ${data.method} jusqu'au ${new Date(data.endsAt).toLocaleDateString("fr-FR")}.`);
    router.refresh();
  }

  function pick(plan: Plan) {
    if (!isAdmin) return;
    if (plan.id === currentPlan && cycle === currentCycle) return;
    if (userCount > plan.maxUsers) {
      setError(`Le plan ${plan.name} est limité à ${plan.maxUsers} utilisateurs (vous en avez ${userCount}).`);
      return;
    }
    setError(null);
    setCheckout(plan);
  }

  return (
    <div>
      <Link href="/settings" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="h-4 w-4" />
        Retour aux paramètres
      </Link>
      <h1 className="text-2xl font-bold">Options d&apos;abonnement</h1>
      <p className="mt-1 text-sm text-slate-500">
        Choisissez l&apos;offre adaptée à votre entreprise. Changez ou annulez à tout moment.
      </p>

      {success && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}
      {error && !checkout && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Bascule mensuel / annuel */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${cycle === "monthly" ? "text-slate-900" : "text-slate-400"}`}>
          Mensuel
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={cycle === "yearly"}
          onClick={() => setCycle((c) => (c === "monthly" ? "yearly" : "monthly"))}
          className={`relative h-6 w-11 rounded-full transition ${cycle === "yearly" ? "bg-indigo-600" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              cycle === "yearly" ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${cycle === "yearly" ? "text-slate-900" : "text-slate-400"}`}>
          Annuel
        </span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          2 mois offerts
        </span>
      </div>

      {/* Cartes d'offres */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = cycle === "monthly" ? plan.monthly : plan.yearly;
          const per = price === 0 ? "" : cycle === "monthly" ? "/mois" : "/an";
          const isCurrent = plan.id === currentPlan && cycle === currentCycle;
          const blocked = userCount > plan.maxUsers;
          return (
            <div
              key={plan.id}
              className={`card relative flex flex-col p-6 ${
                plan.highlight ? "ring-2 ring-indigo-600" : ""
              } ${isCurrent ? "border-emerald-400 bg-emerald-50/40" : ""}`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Le plus populaire
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                  Votre offre actuelle
                </span>
              )}
              <h2 className="text-lg font-bold">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
              <p className="mt-4">
                <span className="text-3xl font-bold">{fmt(price)}</span>
                {per && <span className="text-sm text-slate-400"> {per}</span>}
              </p>
              <p className="mt-1 text-xs text-slate-400">{fmtProducts(plan.maxProducts)} · {plan.maxUsers} utilisateurs</p>
              {cycle === "yearly" && plan.monthly > 0 && (
                <p className="mt-1 text-xs text-emerald-600">soit {fmt(Math.round(plan.yearly / 12))}/mois</p>
              )}
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-slate-600">
                {plan.trialDays && (
                  <li className="flex items-start gap-2 font-medium text-amber-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    Essai gratuit de {plan.trialDays} jours
                  </li>
                )}
                {plan.modules.map((m) => (
                  <li key={m} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {m}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`mt-6 w-full ${isCurrent ? "btn-secondary" : "btn-primary"}`}
                disabled={!isAdmin || isCurrent}
                onClick={() => pick(plan)}
                title={!isAdmin ? "Seul un administrateur peut changer l'abonnement" : undefined}
              >
                {isCurrent ? "Offre actuelle" : blocked ? "Utilisateurs trop nombreux" : plan.id === "GRATUIT" ? "Revenir au gratuit" : "Choisir cette offre"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de paiement */}
      <Modal open={!!checkout} onClose={() => setCheckout(null)} title="Paiement">
        {checkout && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Offre {checkout.name} — {cycle === "monthly" ? "mensuel" : "annuel"}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {fmt(cycle === "monthly" ? checkout.monthly : checkout.yearly)}
              </p>
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}
            <div>
              <p className="label">Moyen de paiement</p>
              <div className="grid gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${
                      method === m.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-medium">{m.label}</span>
                    <span className="text-xs text-slate-400">{m.hint}</span>
                    {method === m.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4 text-transparent" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Démo : le paiement est simulé, aucun débit réel ne sera effectué.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={() => setCheckout(null)}>
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={activate} disabled={busy}>
                {busy ? "Paiement en cours…" : `Payer ${fmt(cycle === "monthly" ? checkout.monthly : checkout.yearly)}`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
