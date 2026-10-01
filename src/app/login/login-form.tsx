"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ accountUpdated = false }: { accountUpdated?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur de connexion");
      return;
    }
    const data = await res.json().catch(() => null);
    router.push(data?.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {accountUpdated && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          Vos accès ont été modifiés. Connectez-vous avec vos nouveaux identifiants.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@entreprise.fr"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
