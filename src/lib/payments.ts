/**
 * Helpers partagés pour l'affichage des paiements d'abonnement (CinetPay).
 */

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  const m = method.toUpperCase();
  if (m === "OM") return "Orange Money";
  if (m === "MTN" || m === "MOMO") return "MTN MoMo";
  if (m === "MOOV" || m === "MOVO") return "Moov Money";
  if (m === "WAVE") return "Wave";
  if (m.includes("VISA") || m.includes("MASTERCARD") || m === "CARD") return "Carte bancaire";
  return method;
}

export function planLabel(planId: string | null | undefined): string {
  if (planId === "STARTER") return "Starter";
  if (planId === "PRO") return "Pro";
  if (planId === "BUSINESS") return "Business";
  if (planId === "GRATUIT") return "Gratuit";
  return planId ?? "—";
}

export function cycleLabel(cycle: string | null | undefined): string {
  if (cycle === "monthly") return "mensuel";
  if (cycle === "yearly") return "annuel";
  return "";
}

/** 99000 → "99 000" (espace insécable simple, compatible PDF WinAnsi). */
export function formatAmount(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function paymentStatusBadge(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "SUCCESS":
      return { label: "Payé", className: "bg-emerald-100 text-emerald-700" };
    case "PENDING":
      return { label: "En attente", className: "bg-amber-100 text-amber-700" };
    default:
      return { label: "Échoué", className: "bg-red-100 text-red-700" };
  }
}
