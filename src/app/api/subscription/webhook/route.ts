import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkPayment, tokensMatch } from "@/lib/cinetpay";
import { activateSubscription } from "@/lib/subscription";
import type { PlanId } from "@/lib/plans";

/**
 * Webhook serveur-à-serveur CinetPay v1 (notify_url).
 * Payload attendu : { notify_token, transaction_id, merchant_transaction_id, status, … }.
 * On ne fait JAMAIS confiance au body : on revérifie systématiquement le statut
 * via GET /v1/payment/{id}, on compare le notify_token à celui stocké à
 * l'initialisation, puis on active l'abonnement si le paiement est SUCCESS.
 * Répond toujours 200 pour éviter les retries infinis de CinetPay.
 */
export async function POST(req: NextRequest) {
  let transactionId: string | null = null;
  let notifyToken: string | null = null;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, unknown> = {};
    if (contentType.includes("application/json")) {
      body = (await req.json()) as Record<string, unknown>;
    } else {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    }
    transactionId =
      (typeof body.transaction_id === "string" && body.transaction_id) ||
      (typeof body.merchant_transaction_id === "string" && body.merchant_transaction_id) ||
      (typeof body.cpm_trans_id === "string" && body.cpm_trans_id) || // tolérance ancien format
      null;
    notifyToken = typeof body.notify_token === "string" ? body.notify_token : null;
  } catch {
    transactionId = req.nextUrl.searchParams.get("transaction_id");
    notifyToken = req.nextUrl.searchParams.get("notify_token");
  }

  if (!transactionId) {
    return NextResponse.json({ ok: false, error: "transaction_id manquant" }, { status: 200 });
  }

  await processPayment(transactionId, notifyToken);
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET(req: NextRequest) {
  const transactionId =
    req.nextUrl.searchParams.get("transaction_id") ?? req.nextUrl.searchParams.get("cpm_trans_id");
  if (transactionId) {
    await processPayment(transactionId, req.nextUrl.searchParams.get("notify_token"));
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}

async function processPayment(transactionId: string, notifyToken: string | null) {
  const payment = await db.payment.findUnique({ where: { transactionId } });
  if (!payment) return; // transaction inconnue : ignorer

  // Authentification du webhook : le notify_token doit correspondre à celui
  // reçu à l'initialisation (comparaison timing-safe).
  let expected: string | null = null;
  try {
    const meta = payment.metadata ? (JSON.parse(payment.metadata) as Record<string, unknown>) : null;
    expected = typeof meta?.notifyToken === "string" ? meta.notifyToken : null;
  } catch {
    expected = null;
  }
  if (expected && !tokensMatch(expected, notifyToken)) {
    await db.payment.update({
      where: { id: payment.id },
      data: { metadata: JSON.stringify({ error: "WEBHOOK_TOKEN_MISMATCH" }) },
    }).catch(() => undefined);
    return;
  }

  const check = await checkPayment(payment.transactionId);
  if (!check.ok) return; // CinetPay injoignable : un nouveau webhook/verify retentera

  if (check.status === "SUCCESS" && payment.status !== "SUCCESS") {
    // Sécurité : vérifier que le montant payé correspond à la commande (si l'API le renvoie)
    if (check.amount != null && Math.round(check.amount) !== Math.round(payment.amount)) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          providerMethod: check.method,
          metadata: JSON.stringify({ error: "AMOUNT_MISMATCH", expected: payment.amount, received: check.amount }),
        },
      });
      return;
    }
    try {
      const result = await activateSubscription(
        payment.organizationId,
        payment.planId as PlanId,
        payment.cycle as "monthly" | "yearly"
      );
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          providerMethod: check.method,
          paidAt: check.paidAt ?? new Date(),
          metadata: JSON.stringify({ endsAt: result.endsAt.toISOString() }),
        },
      });
    } catch (e) {
      // ex. limite d'utilisateurs dépassée : échec enregistré, remboursement manuel
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          providerMethod: check.method,
          metadata: JSON.stringify({ error: "ACTIVATION_FAILED", message: e instanceof Error ? e.message : "erreur" }),
        },
      });
    }
  } else if (
    (check.status === "FAILED" || check.status === "EXPIRED" || check.status === "INSUFFICIENT_BALANCE") &&
    payment.status === "PENDING"
  ) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", providerMethod: check.method, metadata: JSON.stringify({ status: check.status }) },
    });
  }
}
