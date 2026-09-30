import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { checkPayment, isConfigured } from "@/lib/cinetpay";
import { settlePayment } from "@/lib/settle-payment";

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

  const status = await settlePayment(transactionId, check);
  if (status === "FAILED") {
    return NextResponse.json({ status, error: check.status === "EXPIRED" ? "Paiement expiré" : check.status === "SUCCESS" ? "Échec de validation ou d'activation" : "Paiement refusé" });
  }
  return NextResponse.json({ status });
}
