/**
 * Client CinetPay Checkout API v2.
 * https://docs.cinetpay.com — initiation + vérification de transaction.
 *
 * Config requise (variables d'environnement) :
 *   CINETPAY_API_KEY  — clé API (~40 caractères, marchand)
 *   CINETPAY_SITE_ID  — identifiant du service/site marchand
 *   CINETPAY_BASE_URL (optionnel) — pour les tests, ex. http://localhost:3000
 *   Si la clé ou le site ne sont pas définis, isConfigured() vaut false et
 *   l'application retombe sur le paiement simulé (aucun appel réseau).
 */

const API_BASE = "https://api-checkout.cinetpay.com/v2/payment";

export type InitiateArgs = {
  transactionId: string;
  amount: number; // XOF entier
  description: string;
  returnUrl: string; // redirige l'utilisateur après paiement
  notifyUrl: string; // webhook serveur-à-serveur
  customer: {
    name: string;
    surname: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
  };
  channels?: "ALL" | "MOBILE" | "CARD";
  metadata?: Record<string, string | number>;
};

export type InitiateResult =
  | { ok: true; paymentUrl: string; token: string }
  | { ok: false; code: string; message: string };

export function isConfigured(): boolean {
  return Boolean(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID);
}

/** Génère une référence de transaction unique et sûre (alphanumérique + tirets). */
export function newTransactionId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `PAY-${Date.now()}-${rand}`;
}

export async function initiatePayment(args: InitiateArgs): Promise<InitiateResult> {
  const payload = {
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: args.transactionId,
    amount: Math.round(args.amount), // XOF entier, sans décimales
    currency: "XOF",
    description: args.description.slice(0, 255),
    return_url: args.returnUrl,
    notify_url: args.notifyUrl,
    channels: args.channels ?? "ALL",
    lang: "FR",
    metadata: args.metadata ?? {},
    customer: {
      name: args.customer.name.slice(0, 100),
      surname: args.customer.surname.slice(0, 100),
      email: args.customer.email ?? undefined,
      phone_number: args.customer.phone ?? undefined,
      address: args.customer.address ?? "Abidjan",
      city: args.customer.city ?? "Abidjan",
      state: "Abidjan",
      country: "CI",
      zip_code: "01",
    },
  };

  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);
  if (!json || json.code !== "00" || !json.data?.payment_url) {
    return {
      ok: false,
      code: String(json?.code ?? res.status),
      message: String(json?.message ?? "Appel CinetPay échoué"),
    };
  }
  return { ok: true, paymentUrl: json.data.payment_url, token: json.data.token };
}

export type CheckResult =
  | {
      ok: true;
      status: "VALIDATED" | "REFUSED" | "CANCELLED" | string;
      amount: number | null;
      currency: string | null;
      method: string | null;
      paidAt: Date | null;
    }
  | { ok: false; code: string; message: string };

/** Interroge CinetPay pour connaître l'état réel d'une transaction. */
export async function checkPayment(transactionId: string): Promise<CheckResult> {
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!json || json.code !== "00" || !json.data) {
    return {
      ok: false,
      code: String(json?.code ?? res.status),
      message: String(json?.message ?? "Vérification CinetPay échouée"),
    };
  }
  const d = json.data;
  const paidAt = d.payment_date ? new Date(String(d.payment_date).replace(" ", "T") + "Z") : null;
  return {
    ok: true,
    status: String(d.status ?? d.cpm_trans_status ?? "UNKNOWN"),
    amount: d.amount != null ? Number(d.amount) : d.cpm_amount != null ? Number(d.cpm_amount) : null,
    currency: d.currency ?? d.cpm_currency ?? null,
    method: d.payment_method ?? null,
    paidAt: paidAt && !isNaN(paidAt.getTime()) ? paidAt : null,
  };
}
