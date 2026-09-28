import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkPayment } from "@/lib/cinetpay";
import { activateSubscription } from "@/lib/subscription";
import type { PlanId } from "@/lib/plans";

/**
 * Webhook serveur-à-serveur CinetPay (notify_url).
 * Le POST de CinetPay ne contient que cpm_trans_id : on ne lui fait JAMAIS
 * confiance — on revérifie systématiquement le statut via /v2/payment/check
 * puis on active l'abonnement si le paiement est VALIDATED.
 * Répond toujours 200 pour éviter les retries infinis de CinetPay.
 */
export async function POST(req: NextRequest) {
  let transactionId: string | null = null;
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      transactionId = body?.cpm_trans_id ?? body?.transaction_id ?? null;
    } else {
      const form = await req.formData();
      transactionId = (form.get("cpm_trans_id") as string | null) ?? null;
    }
  } catch {
    transactionId = req.nextUrl.searchParams.get("cpm_trans_id");
  }

  if (!transactionId) {
    return NextResponse.json({ ok: false, error: "cpm_trans_id manquant" }, { status: 200 });
  }

  await processPayment(transactionId);
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET(req: NextRequest) {
  const transactionId = req.nextUrl.searchParams.get("cpm_trans_id");
  if (transactionId) await processPayment(transactionId);
  return NextResponse.json({ ok: true }, { status: 200 });
}

async function processPayment(transactionId: string) {
  const payment = await db.payment.findUnique({ where: { transactionId } });
  if (!payment) return; // transaction inconnue : ignorer

  const check = await checkPayment(transactionId);
  if (!check.ok) return; // CinetPay injoignable : un nouveau webhook/verify retentera

  if (check.status === "VALIDATED" && payment.status !== "SUCCESS") {
    // Sécurité : vérifier que le montant payé correspond à la commande
    if (check.amount != null && Math.round(check.amount) !== Math.round(payment.amount)) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          providerMethod: check.method,
          paidAt: check.paidAt,
          metadata: JSON.stringify({ error: "AMOUNT_MISMATCH", expected: payment.amount, received: check.amount }),
        },
      });
      return;
    }
    try {
      const result = await activateSubscription(payment.organizationId, payment.planId as PlanId, payment.cycle as "monthly" | "yearly");
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
      // ex. limite d'utilisateurs dépassée : on enregistre l'échec, remboursement à traiter manuellement
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          providerMethod: check.method,
          paidAt: check.paidAt,
          metadata: JSON.stringify({ error: "ACTIVATION_FAILED", message: e instanceof Error ? e.message : "erreur" }),
        },
      });
    }
  } else if ((check.status === "REFUSED" || check.status === "CANCELLED") && payment.status === "PENDING") {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", providerMethod: check.method, metadata: JSON.stringify({ status: check.status }) },
    });
  }
}
