"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, Download, Receipt, Sparkles, X } from "lucide-react";
import { Modal } from "@/components/ui";
import { PLANS, type Plan } from "@/lib/plans";
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

type CheckoutResponse = {
  ok: boolean;
  mode: "gratuit" | "demo" | "cinetpay";
  paymentUrl?: string;
  endsAt?: string;
  amountPaid?: number;
  error?: string;
};

export function PlansClient({
  isAdmin,
  currentPlan,
  currentCycle,
  userCount,
  currency,
  payments,
}: {
  isAdmin: boolean;
  currentPlan: string;
  currentCycle: "monthly" | "yearly" | null;
  userCount: number;
  currency: string;
  payments: PaymentRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null); // transaction en attente de confirmation
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fmt = (n: number) => (n === 0 ? "Gratuit" : `${n.toLocaleString("fr-FR")} F CFA`);
  const fmtProducts = (n: number | null) => (n === null ? "Produits illimités" : `${n} produits`);

  // Retour de CinetPay : /plans?payment=PAY-... → polling de vérification
  useEffect(() => {
    const txn = searchParams.get("payment");
    if (!txn) return;
    // nettoie l'URL immédiatement (évite de re-poller au refresh)
    window.history.replaceState({}, "", "/plans");
    setPending(txn);

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 40) {
        clearInterval(pollRef.current!);
        setPending(null);
        setError("La confirmation du paiement prend trop de temps. Contactez le support si le débit a été effectué.");
        return;
      }
      const res = await fetch(`/api/subscription/verify?transaction=${encodeURIComponent(txn)}`);
      const data = await res.json().catch(() => null);
      if (data?.status === "SUCCESS") {
        clearInterval(pollRef.current!);
        setPending(null);
        setSuccess("Paiement confirmé ! Votre abonnement est activé.");
        router.refresh();
      } else if (data?.status === "FAILED") {
        clearInterval(pollRef.current!);
        setPending(null);
        setError(data?.error ?? "Le paiement n'a pas abouti.");
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activate() {
    if (!checkout) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: checkout.id, cycle }),
    });
    setBusy(false);
    const data: CheckoutResponse | null = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Échec de l'initialisation du paiement");
      return;
    }
    if (data.mode === "cinetpay" && data.paymentUrl) {
      // Redirection vers la caisse CinetPay (Mobile Money + cartes)
      window.location.href = data.paymentUrl;
      return;
    }
    // Modes sans redirection (gratuit ou démo)
    setCheckout(null);
    setSuccess(
      data.mode === "demo"
        ? `Mode démo : abonnement ${checkout.name} activé jusqu'au ${new Date(data.endsAt!).toLocaleDateString("fr-FR")} (aucun débit). Configurez les clés CinetPay pour encaisser réellement.`
        : `Abonnement gratuit activé jusqu'au ${new Date(data.endsAt!).toLocaleDateString("fr-FR")}.`
    );
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
      {pending && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Paiement en cours de confirmation (transaction {pending})…
        </div>
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

      {/* Historique des paiements */}
      <section className="mt-10">
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
      </section>

      {/* Modal de confirmation avant paiement */}
      <Modal open={!!checkout} onClose={() => setCheckout(null)} title="Paiement sécurisé">
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
            <p className="text-sm text-slate-600">
              Vous serez redirigé vers la plateforme sécurisée <strong>CinetPay</strong> pour régler par
              Mobile Money (Orange, MTN, Moov, Wave) ou carte bancaire. Vous reviendrez automatiquement
              sur Stockkonect une fois le paiement effectué.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={() => setCheckout(null)}>
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={activate} disabled={busy}>
                {busy ? "Redirection…" : `Payer ${fmt(cycle === "monthly" ? checkout.monthly : checkout.yearly)}`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
