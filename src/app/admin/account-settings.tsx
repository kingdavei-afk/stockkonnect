"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

export function AdminAccountSettings({ email }: { email: string }) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword && newPassword !== confirmPassword) {
      setError("La confirmation du nouveau mot de passe ne correspond pas.");
      return;
    }
    if (!newEmail.trim() && !newPassword) {
      setError("Modifiez l’adresse e-mail ou renseignez un nouveau mot de passe.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          ...(newEmail.trim() ? { email: newEmail.trim() } : {}),
          ...(newPassword ? { newPassword } : {}),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Impossible de modifier les accès.");
        return;
      }

      // Le serveur invalide toutes les anciennes sessions après la modification.
      router.replace("/login?accountUpdated=1");
      router.refresh();
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="superadmin-account" className="card mb-6 p-5 sm:p-6" aria-labelledby="superadmin-account-title">
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <h2 id="superadmin-account-title" className="text-lg font-bold">Sécurité de mon compte</h2>
          <p className="mt-1 text-sm text-slate-500">Modifiez l’e-mail ou le mot de passe de votre compte super-admin.</p>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <label className="label">
          <span className="mb-1 flex items-center gap-2"><Mail className="h-4 w-4" /> Adresse e-mail</span>
          <input className="input" type="email" autoComplete="username" required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
        </label>
        <label className="label">
          <span className="mb-1 flex items-center gap-2"><KeyRound className="h-4 w-4" /> Mot de passe actuel</span>
          <input className="input" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        </label>
        <label className="label">
          Nouveau mot de passe <span className="font-normal text-slate-500">(facultatif, 16 caractères minimum)</span>
          <input className="input mt-1" type="password" autoComplete="new-password" minLength={16} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        </label>
        <label className="label">
          Confirmer le nouveau mot de passe
          <input className="input mt-1" type="password" autoComplete="new-password" minLength={16} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2" role="alert">{error}</p>}
        <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Après l’enregistrement, toutes les sessions seront fermées. Connectez-vous avec vos nouveaux accès.</p>
          <button className="btn-primary shrink-0" type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer mes accès"}
          </button>
        </div>
      </form>
    </section>
  );
}
