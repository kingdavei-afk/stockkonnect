import { db } from "@/lib/db";
import type { CheckResult } from "@/lib/cinetpay";
import type { PlanId } from "@/lib/plans";
import { activateSubscription, SubscriptionActivationError } from "@/lib/subscription";

type VerifiedPayment = Extract<CheckResult, { ok: true }>;

async function currentStatus(transactionId: string) {
  const payment = await db.payment.findUnique({ where: { transactionId }, select: { status: true } });
  return payment?.status ?? "NOT_FOUND";
}

/** Settles a verified provider status once, with activation and payment success committed together. */
export async function settlePayment(transactionId: string, check: VerifiedPayment): Promise<string> {
  if (check.status === "SUCCESS") {
    const payment = await db.payment.findUnique({ where: { transactionId } });
    if (!payment) return "NOT_FOUND";

    if (check.amount != null && Math.round(check.amount) !== Math.round(payment.amount)) {
      await db.payment.updateMany({
        where: { transactionId, status: "PENDING" },
        data: {
          status: "FAILED",
          providerMethod: check.method,
          metadata: JSON.stringify({ error: "AMOUNT_MISMATCH", expected: payment.amount, received: check.amount }),
        },
      });
      return currentStatus(transactionId);
    }

    try {
      return await db.$transaction(async (tx) => {
        const claim = await tx.payment.updateMany({
          where: { transactionId, status: "PENDING" },
          data: { status: "PROCESSING" },
        });
        if (claim.count !== 1) {
          const existing = await tx.payment.findUnique({ where: { transactionId }, select: { status: true } });
          return existing?.status ?? "NOT_FOUND";
        }

        const result = await activateSubscription(
          payment.organizationId,
          payment.planId as PlanId,
          payment.cycle as "monthly" | "yearly",
          tx
        );
        await tx.payment.update({
          where: { transactionId, status: "PROCESSING" },
          data: {
            status: "SUCCESS",
            providerMethod: check.method,
            paidAt: check.paidAt ?? new Date(),
            metadata: JSON.stringify({ endsAt: result.endsAt.toISOString() }),
          },
        });
        return "SUCCESS";
      });
    } catch (error) {
      if (!(error instanceof SubscriptionActivationError)) throw error;
      await db.payment.updateMany({
        where: { transactionId, status: "PENDING" },
        data: {
          status: "FAILED",
          providerMethod: check.method,
          metadata: JSON.stringify({ error: "ACTIVATION_FAILED", message: error.message }),
        },
      });
      return currentStatus(transactionId);
    }
  }

  if (["FAILED", "EXPIRED", "INSUFFICIENT_BALANCE"].includes(check.status)) {
    await db.payment.updateMany({
      where: { transactionId, status: "PENDING" },
      data: {
        status: "FAILED",
        providerMethod: check.method,
        metadata: JSON.stringify({ status: check.status }),
      },
    });
  }

  return currentStatus(transactionId);
}
