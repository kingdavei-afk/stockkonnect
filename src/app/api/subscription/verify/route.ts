import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { checkPayment, isConfigured } from "@/lib/cinetpay";
import { activateSubscription } from "@/lib/subscription";
import type { PlanId } from "@/lib/plans";

/**
 * Polling côté client après le retour de CinetPay (return_url /plans).
 * Vérifie l'état réel de la transaction auprès de CinetPay et active
 * l'abonnement si payée (le webhook peut arriver avant ou après le retour).
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const transactionId = req.nextUrl.searchParams.get("transaction");
  if (!transactionId) return NextResponse.json({ error: "transaction manquante" }, { status: 400 });

  const payment = await db.payment.findUnique({ where: { transactionId } });
  if (!payment || payment.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  }

  if (payment.status === "SUCCESS") {
    return NextResponse.json({ status: "SUCCESS" });
  }

  if (!isConfigured()) {
    return NextResponse.json({ status: payment.status });
  }

  const check = await checkPayment(transactionId);
  if (!check.ok) return NextResponse.json({ status: payment.status });

  if (check.status === "SUCCESS" && payment.status !== "SUCCESS") {
    if (check.amount != null && Math.round(check.amount) !== Math.round(payment.amount)) {
      await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      return NextResponse.json({ status: "FAILED", error: "Montant incohérent" });
    }
    try {
      await activateSubscription(payment.organizationId, payment.planId as PlanId, payment.cycle as "monthly" | "yearly");
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS", providerMethod: check.method, paidAt: check.paidAt ?? new Date() },
      });
      return NextResponse.json({ status: "SUCCESS" });
    } catch (e) {
      await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      return NextResponse.json({ status: "FAILED", error: e instanceof Error ? e.message : "Échec d'activation" });
    }
  }

  if (
    (check.status === "FAILED" || check.status === "EXPIRED" || check.status === "INSUFFICIENT_BALANCE") &&
    payment.status === "PENDING"
  ) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", metadata: JSON.stringify({ status: check.status }) },
    });
    return NextResponse.json({ status: "FAILED", error: check.status === "EXPIRED" ? "Paiement expiré" : "Paiement refusé" });
  }

  return NextResponse.json({ status: payment.status });
}
