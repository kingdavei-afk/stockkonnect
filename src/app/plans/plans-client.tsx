"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ChevronLeft, Download, Receipt } from "lucide-react";
import { PUBLIC_PLANS, type Plan } from "@/lib/plans";
import {
  cycleLabel,
  formatAmount,
  paymentMethodLabel,
  paymentStatusBadge,
  planLabel,
} from "@/lib/payments";

export type PaymentRow = {
  id: string;
  transactionId: string;
  amount: number;
  cycle: string;
  planId: string;
  status: string;
  method: string | null;
  paidAt: string;
};

export function PlansClient({
  isAdmin,
  isPublic = false,
  organizationName,
  currentPlan,
  currentCycle,
  userCount,
  payments,
}: {
  isAdmin?: boolean;
  isPublic?: boolean;
  organizationName?: string;
  currentPlan: string | null;
  currentCycle: "monthly" | "yearly" | null;
  userCount: number;
  payments: PaymentRow[];
}) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState<string | null>(null);

  const fmt = (n: number) => (n === 0 ? "Gratuit" : `${n.toLocaleString("fr-FR")} F CFA`);
  const fmtProducts = (n: number | null) => (n === null ? "Produits illimités" : `${n} produits`);

  function pick(plan: Plan) {
    if (isPublic) {
      const cycleName = cycle === "monthly" ? "mensuelle" : "annuelle";
      const message = `Bonjour Stockkonect, je souhaite souscrire à l'offre ${plan.name} (${cycleName}). Merci de m'indiquer la procédure de paiement.`;
      window.open(`https://wa.me/2250748323191?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (!isAdmin) return;
    if (plan.id === currentPlan && cycle === currentCycle) return;
    if (userCount > plan.maxUsers) {
      setError(`Le plan ${plan.name} est limité à ${plan.maxUsers} utilisateurs (vous en avez ${userCount}).`);
      return;
    }
    setError(null);
    const cycleName = cycle === "monthly" ? "mensuelle" : "annuelle";
    const message = `Bonjour Stockkonect, je souhaite souscrire à l'offre ${plan.name} (${cycleName}) pour l'entreprise ${organizationName}. Merci de m'indiquer la procédure de paiement.`;
    window.open(`https://wa.me/2250748323191?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <Link href={isPublic ? "/" : "/settings"} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        {isPublic ? (
          <Image src="/stockkonect-logo.svg" alt="Stockkonect — accueil" width={680} height={136} className="h-9 w-auto" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" />
            Retour aux paramètres
          </>
        )}
      </Link>
      <h1 className="text-2xl font-bold">{isPublic ? "Nos prix" : "Options d'abonnement"}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Choisissez l&apos;offre adaptée à votre entreprise.{!isPublic && " Changez ou annulez à tout moment."}
      </p>

      {error && (
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
        {PUBLIC_PLANS.map((plan) => {
          const price = cycle === "monthly" ? plan.monthly : plan.yearly;
          const per = price === 0 ? "" : cycle === "monthly" ? "/mois" : "/an";
          const isCurrent = !isPublic && plan.id === currentPlan && (plan.id === "GRATUIT" || cycle === currentCycle);
          const blocked = !isPublic && userCount > plan.maxUsers;
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
                disabled={!isPublic && (!isAdmin || isCurrent)}
                onClick={() => pick(plan)}
                title={!isPublic && !isAdmin ? "Seul un administrateur peut changer l'abonnement" : undefined}
              >
                {isCurrent ? "Offre actuelle" : "Choisir cette offre"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Historique des paiements */}
      {!isPublic && <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Receipt className="h-5 w-5 text-slate-400" />
          Historique des paiements
        </h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Aucun paiement pour le moment.</p>
        ) : (
          <div className="card mt-3 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th>Transaction</th>
                    <th>Offre</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Méthode</th>
                    <th>Date</th>
                    <th className="text-right">Reçu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => {
                    const badge = paymentStatusBadge(p.status);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="font-mono text-xs">{p.transactionId}</td>
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
                        <td className="text-right">
                          {p.status === "SUCCESS" ? (
                            <a
                              href={`/api/subscription/invoice?transaction=${encodeURIComponent(p.transactionId)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary !px-3 !py-1.5 text-xs"
                            >
                              <Download className="h-3 w-3" /> Facture
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>}

    </div>
  );
}
