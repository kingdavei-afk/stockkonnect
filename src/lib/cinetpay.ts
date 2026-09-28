/**
 * Client API CinetPay v1 (paiements + vérification de statut).
 *
 * ⚠️ L'ancienne « Checkout API v2 » (api-checkout.cinetpay.com) n'existe plus :
 * le domaine a été retiré du DNS (NXDOMAIN, Cloudflare erreur 1016). L'API
 * actuelle est celle documentée dans les SDK officiels github.com/cinetpay :
 *   - Sandbox    : https://api.cinetpay.net  (clés sk_test_…)
 *   - Production : https://api.cinetpay.co    (clés sk_live_…)
 *   - Caisse     : https://secure.cinetpay.{net|co}/checkout/{payment_token}
 *
 * Authentification : POST /v1/oauth/login { api_key, api_password } → JWT (~24 h).
 * Initialisation   : POST /v1/payment            (Bearer JWT)
 * Statut           : GET  /v1/payment/{identifiant} (payment_token, transaction_id
 *                    ou merchant_transaction_id)
 *
 * Variables d'environnement :
 *   CINETPAY_API_KEY      — clé API (sk_test_… en sandbox, sk_live_… en prod)
 *   CINETPAY_API_PASSWORD — mot de passe API associé (back-office marchand)
 *   CINETPAY_API_BASE     — override de l'URL d'API (tests)
 * Sans clé OU sans mot de passe, isConfigured() vaut false : l'application
 * retombe sur le paiement simulé (mode démo, aucun appel réseau).
 */

/** Correspondance code numérique API → statut textuel (SDK officiels CinetPay). */
const API_CODE_TO_STATUS: Record<number, string> = {
  100: "SUCCESS",
  2001: "INITIATED",
  2002: "PENDING",
  2003: "EXPIRED",
  2005: "INSUFFICIENT_BALANCE",
  2010: "FAILED",
  2011: "NOT_ALLOWED",
  1200: "TRANSACTION_EXIST",
  404: "NOT_FOUND",
};

export type CinetPayFailure = { ok: false; code: string; message: string };

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

/** Clé + mot de passe présents → paiements réels activés. */
export function isConfigured(): boolean {
  return Boolean(env("CINETPAY_API_KEY") && env("CINETPAY_API_PASSWORD"));
}

function isLive(): boolean {
  return (env("CINETPAY_API_KEY") ?? "").startsWith("sk_live_");
}

function apiBase(): string {
  const override = env("CINETPAY_API_BASE");
  if (override) return override.replace(/\/+$/, "");
  return isLive() ? "https://api.cinetpay.co" : "https://api.cinetpay.net";
}

/** Référence marchande unique — 30 caractères max côté API. */
export function newTransactionId(): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `SK${Date.now().toString(36)}${rand}`;
}

/** Comparaison timing-safe du notify_token du webhook avec celui stocké. */
export function tokensMatch(
  expected: string | null | undefined,
  received: string | null | undefined
): boolean {
  if (!expected || !received || expected.length !== received.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}

/* ------------------------------------------------------------------ */
/* Authentification (JWT)                                              */
/* ------------------------------------------------------------------ */

type CachedToken = { value: string; expiresAt: number };
let tokenCache: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.value;
  }
  const res = await fetch(`${apiBase()}/v1/oauth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env("CINETPAY_API_KEY"),
      api_password: env("CINETPAY_API_PASSWORD"),
    }),
  });
  const json = (await res.json().catch(() => null)) as
    | { access_token?: unknown; expires_in?: unknown; status?: unknown; description?: unknown }
    | null;
  const token = typeof json?.access_token === "string" ? json.access_token : null;
  if (!token) {
    const reason = String(json?.description ?? json?.status ?? res.status);
    throw new Error(`Authentification CinetPay échouée : ${reason}`);
  }
  const expiresIn = Number(json?.expires_in ?? 86400); // 24 h par défaut
  tokenCache = { value: token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

/** Appel API avec Bearer JWT et re-auth automatique si le token expire (1003). */
async function apiCall(
  path: string,
  init: (token: string) => RequestInit
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const call = async (token: string) => {
    const res = await fetch(`${apiBase()}${path}`, init(token));
    return { status: res.status, json: (await res.json().catch(() => null)) as Record<string, unknown> | null };
  };

  let token = await getAccessToken();
  let out = await call(token);
  const apiStatus = out.json?.status;
  const apiCode = Number(out.json?.code);
  if (apiStatus === "EXPIRED_TOKEN" || apiStatus === "INVALID_TOKEN" || apiCode === 1003 || apiCode === 1002) {
    tokenCache = null;
    token = await getAccessToken();
    out = await call(token);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Initialisation d'un paiement                                        */
/* ------------------------------------------------------------------ */

export type InitiateArgs = {
  transactionId: string; // référence marchande (max 30 caractères)
  amount: number; // XOF entier (min 100, max 2 500 000)
  description: string; // libellé affiché sur la caisse
  returnUrl: string; // redirection après succès
  failureUrl?: string; // redirection après échec (défaut : returnUrl)
  notifyUrl: string; // webhook serveur-à-serveur
  customer: {
    name: string; // prénom
    surname: string; // nom
    email: string; // obligatoire (doit être valide)
    phone?: string | null;
    city?: string | null;
  };
};

export type InitiateResult =
  | {
      ok: true;
      paymentUrl: string; // caisse CinetPay — y rediriger le client
      paymentToken: string; // jeton de la transaction
      notifyToken: string; // jeton à comparer avec celui du webhook
      transactionId: string; // identifiant CinetPay
    }
  | CinetPayFailure;

/** Initialise un paiement et renvoie l'URL de la caisse CinetPay. */
export async function initiatePayment(args: InitiateArgs): Promise<InitiateResult> {
  if (!isConfigured()) {
    return { ok: false, code: "NOT_CONFIGURED", message: "Clés CinetPay absentes" };
  }

  const body = {
    currency: "XOF",
    merchant_transaction_id: args.transactionId.slice(0, 30),
    amount: Math.round(args.amount),
    lang: "fr",
    designation: args.description.slice(0, 100),
    client_email: args.customer.email.slice(0, 100),
    client_first_name: (args.customer.name || "Client").slice(0, 100),
    client_last_name: (args.customer.surname || "Stockkonect").slice(0, 100),
    success_url: args.returnUrl.slice(0, 120),
    failed_url: (args.failureUrl ?? args.returnUrl).slice(0, 120),
    notify_url: args.notifyUrl.slice(0, 120),
    channel: "PUSH", // redirection vers la caisse (tous les moyens du pays)
  };

  try {
    const { json } = await apiCall("/v1/payment", (token) => ({
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }));

    const paymentUrl = typeof json?.payment_url === "string" ? json.payment_url : null;
    const paymentToken = typeof json?.payment_token === "string" ? json.payment_token : null;
    if (paymentUrl && paymentToken) {
      return {
        ok: true,
        paymentUrl,
        paymentToken,
        notifyToken: typeof json?.notify_token === "string" ? json.notify_token : "",
        transactionId: typeof json?.transaction_id === "string" ? json.transaction_id : args.transactionId,
      };
    }
    return {
      ok: false,
      code: String(json?.status ?? json?.code ?? "UNKNOWN"),
      message: String(json?.description ?? json?.message ?? "Initialisation du paiement échouée"),
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      message: e instanceof Error ? e.message : "API CinetPay injoignable",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Vérification du statut d'une transaction                            */
/* ------------------------------------------------------------------ */

export type CheckResult =
  | {
      ok: true;
      status: "SUCCESS" | "FAILED" | "PENDING" | "INITIATED" | "EXPIRED" | string;
      amount: number | null; // non renvoyé par l'API v1 : contrôle optionnel côté appelant
      currency: string | null;
      method: string | null;
      paidAt: Date | null;
    }
  | CinetPayFailure;

/** Interroge CinetPay pour connaître l'état réel d'une transaction. */
export async function checkPayment(identifier: string): Promise<CheckResult> {
  if (!isConfigured()) {
    return { ok: false, code: "NOT_CONFIGURED", message: "Clés CinetPay absentes" };
  }

  try {
    const { json } = await apiCall(`/v1/payment/${encodeURIComponent(identifier)}`, (token) => ({
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }));

    const apiCode = Number(json?.code);
    const rawStatus =
      typeof json?.status === "string" && json.status !== ""
        ? json.status
        : (API_CODE_TO_STATUS[apiCode] ?? "UNKNOWN");

    return {
      ok: true,
      status: rawStatus,
      amount: json?.amount != null ? Number(json.amount) : null,
      currency: typeof json?.currency === "string" ? json.currency : null,
      method: typeof json?.payment_method === "string" ? json.payment_method : null,
      paidAt: null, // l'API v1 ne renvoie pas de date de paiement exploitable
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      message: e instanceof Error ? e.message : "API CinetPay injoignable",
    };
  }
}
