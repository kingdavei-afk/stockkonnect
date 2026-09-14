"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, FileText, CreditCard, Sparkles } from "lucide-react";

const CURRENCIES = [
  { code: "EUR", label: "Euro (€)" },
  { code: "USD", label: "Dollar US ($)" },
  { code: "CHF", label: "Franc suisse (CHF)" },
  { code: "GBP", label: "Livre sterling (£)" },
  { code: "CAD", label: "Dollar canadien (C$)" },
  { code: "MAD", label: "Dirham marocain (MAD)" },
  { code: "XOF", label: "Franc CFA (XOF)" },
];

type Organization = {
  name: string;
  address: string;
  phone: string;
  email: string;
  industry: string;
  taxId: string;
  bankAccount: string;
  mainActivities: string;
};

type Subscription = {
  planId: string;
  planName: string;
  startsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  userCount: number;
  maxUsers: number;
  productCount: number;
  maxProducts: number | null;
  monthlyPrice: number;
  cycle: "monthly" | "yearly" | null;
  modules: string[];
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

export function SettingsClient({
  isAdmin,
  userName,
  userEmail,
  role,
  organization: initialOrg,
  currency: initialCurrency,
  lowStockThreshold: initialThreshold,
  subscription,
}: {
  isAdmin: boolean;
  userName: string;
  userEmail: string;
  role: string;
  organization: Organization;
  currency: string;
  lowStockThreshold: number;
  subscription: Subscription;
}) {
  const router = useRouter();
  const [org, setOrg] = useState(initialOrg);
  const [currency, setCurrency] = useState(initialCurrency);
  const [threshold, setThreshold] = useState(String(initialThreshold));
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const trialDaysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  const set = (patch: Partial<Organization>) => setOrg((o) => ({ ...o, ...patch }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationName: org.name,
        currency,
        lowStockThreshold: Number(threshold) || 0,
        address: org.address,
        phone: org.phone,
        email: org.email,
        industry: org.industry,
        taxId: org.taxId,
        bankAccount: org.bankAccount,
        mainActivities: org.mainActivities,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setMessage({ type: "err", text: data?.error ?? "Erreur d'enregistrement" });
      return;
    }
    setMessage({ type: "ok", text: "Paramètres enregistrés." });
    router.refresh();
  }

  const field = (label: string, key: keyof Organization, props: Record<string, string | boolean | undefined> = {}) => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        value={org[key]}
        onChange={(e) => set({ [key]: e.target.value } as Partial<Organization>)}
        disabled={!isAdmin}
        {...props}
      />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <p className="mt-1 text-sm text-slate-500">
        Configurez votre entreprise, vos documents et votre abonnement.
      </p>

      {message && (
        <div
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* 1. Informations générales */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Building2 className="h-4 w-4 text-indigo-600" />
            Informations générales — Entreprise
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("Nom de l'entreprise", "name", { required: true })}</div>
            {field("Adresse", "address", { placeholder: "Ex : Abidjan, Cocody Riviera 3" })}
            {field("Numéro de téléphone", "phone", { placeholder: "Ex : +225 07 48 32 31 91" })}
            {field("Email", "email", { type: "email", placeholder: "contact@entreprise.ci" })}
            {field("Domaine d'activité", "industry", { placeholder: "Ex : Commerce de détail" })}
            <div>
              <label className="label">Devise</label>
              <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!isAdmin}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Seuil global d&apos;alerte stock</label>
              <input
                type="number"
                min="0"
                className="input"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                disabled={!isAdmin}
              />
              <p className="mt-1 text-xs text-slate-400">Valeur par défaut des nouveaux produits.</p>
            </div>
          </div>
        </section>

        {/* 2. Informations sur les documents */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <FileText className="h-4 w-4 text-indigo-600" />
            Informations sur les documents
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Ces informations apparaîtront sur vos factures et documents officiels.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {field("Numéro d'identité fiscale", "taxId", { placeholder: "Ex : CI-ABJ-2026-B-12345" })}
            {field("Numéro de compte bancaire", "bankAccount", { placeholder: "Ex : CI93 CI15 0100 0001 ..." })}
            <div className="sm:col-span-2">
              <label className="label">Activités principales</label>
              <textarea
                className="input min-h-[80px]"
                value={org.mainActivities}
                onChange={(e) => set({ mainActivities: e.target.value })}
                placeholder="Ex : Vente d'articles de bureau, fournitures scolaires, accessoires électroniques"
                disabled={!isAdmin}
              />
            </div>
          </div>
        </section>

        {isAdmin && (
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        )}
      </form>

      {/* 3. Abonnement et fidélisation */}
      <section className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <CreditCard className="h-4 w-4 text-indigo-600" />
          Abonnement et fidélisation
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Mon abonnement</p>
            <p className="mt-0.5 flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {subscription.planName}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Tarif mensuel</p>
            <p className="mt-0.5 font-semibold">
              {subscription.monthlyPrice === 0 ? "Gratuit" : `${subscription.monthlyPrice.toLocaleString("fr-FR")} F CFA`}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Début</p>
            <p className="mt-0.5 font-semibold">{fmtDate(subscription.startsAt)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Fin</p>
            <p className="mt-0.5 font-semibold">{fmtDate(subscription.endsAt)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Statut</p>
            <p className="mt-0.5">
              <span className="badge bg-emerald-100 text-emerald-700">Actif</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Nombre d&apos;utilisateurs</p>
            <p className="mt-0.5 font-semibold">
              {subscription.userCount} / {subscription.maxUsers}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Produits</p>
            <p className="mt-0.5 font-semibold">
              {subscription.productCount} / {subscription.maxProducts ?? "illimité"}
            </p>
          </div>
        </div>

        {trialDaysLeft !== null && (
          <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Période d&apos;essai : <strong>{trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}</strong> (jusqu&apos;au {fmtDate(subscription.trialEndsAt)}). Passez à une offre payante pour continuer après l&apos;essai.
          </div>
        )}

        <div className="mt-5">
          <p className="text-sm font-medium">Modules activés</p>
          <ul className="mt-2 grid gap-1.5 text-sm text-slate-600 sm:grid-cols-2">
            {subscription.modules.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {m}
              </li>
            ))}
          </ul>
        </div>

        {isAdmin && (
          <Link href="/plans" className="btn-primary mt-6 w-full sm:w-auto">
            <CreditCard className="h-4 w-4" />
            Les options d&apos;abonnement
          </Link>
        )}
      </section>

      <div className="card mt-6 p-6">
        <h2 className="font-semibold">Votre compte</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Nom</dt>
            <dd className="font-medium">{userName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium">{userEmail}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Rôle</dt>
            <dd>
              <span className="badge bg-indigo-100 text-indigo-700">
                {role === "ADMIN" ? "Administrateur" : "Employé"}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
