import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { activateSubscription } from "@/lib/subscription";
import { isConfigured, initiatePayment, newTransactionId } from "@/lib/cinetpay";

const schema = z.object({
  planId: z.enum(["GRATUIT", "PRO", "BUSINESS"]),
  cycle: z.enum(["monthly", "yearly"]),
  // Conservé pour le mode démo (sans clés CinetPay)
  paymentMethod: z.enum(["orange-money", "wave", "mtn-money", "card"]).optional(),
});

function baseUrl(req: NextRequest) {
  return (
    process.env.CINETPAY_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    req.nextUrl.origin
  );
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut gérer l'abonnement" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { planId, cycle } = parsed.data;

  const org = await db.organization.findUnique({ where: { id: user.organizationId } });
  if (!org) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });

  // Le gratuit s'active directement, sans paiement
  if (planId === "GRATUIT") {
    const result = await activateSubscription(org.id, planId, cycle);
    return NextResponse.json({ ok: true, mode: "gratuit", endsAt: result.endsAt.toISOString() });
  }

  const amount = cycle === "monthly" ? planPrice(planId, "monthly") : planPrice(planId, "yearly");

  // Mode démo : pas de clés CinetPay → activation simulée (aucun débit)
  if (!isConfigured()) {
    const result = await activateSubscription(org.id, planId, cycle);
    return NextResponse.json({ ok: true, mode: "demo", endsAt: result.endsAt.toISOString(), amountPaid: result.amount });
  }

  // Paiement réel : enregistrement puis redirection vers CinetPay
  const transactionId = newTransactionId();
  const payment = await db.payment.create({
    data: {
      transactionId,
      amount,
      cycle,
      planId,
      organizationId: org.id,
      metadata: JSON.stringify({ org: org.name, plan: planId, cycle }),
    },
  });

  const initiated = await initiatePayment({
    transactionId,
    amount,
    description: `Stockkonect — offre ${planId === "PRO" ? "Pro" : "Business"} ${cycle === "monthly" ? "mensuelle" : "annuelle"}`,
    returnUrl: `${baseUrl(req)}/plans?payment=${transactionId}`,
    notifyUrl: `${baseUrl(req)}/api/subscription/webhook`,
    customer: {
      name: (org.name ?? "Client").split(" ")[0].slice(0, 50),
      surname: org.name ?? "Client",
      email: org.email ?? user.email,
      phone: org.phone,
      city: org.address?.slice(0, 80) ?? "Abidjan",
    },
    metadata: { organizationId: org.id, planId, cycle },
  });

  if (!initiated.ok) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", metadata: JSON.stringify({ error: initiated.code, message: initiated.message }) },
    });
    return NextResponse.json(
      { error: `Initialisation du paiement échouée (${initiated.code}) : ${initiated.message}` },
      { status: 502 }
    );
  }

  await db.payment.update({
    where: { id: payment.id },
    data: { providerToken: initiated.token },
  });

  return NextResponse.json({ ok: true, mode: "cinetpay", paymentUrl: initiated.paymentUrl });
}

function planPrice(planId: string, cycle: "monthly" | "yearly"): number {
  const prices: Record<string, { monthly: number; yearly: number }> = {
    PRO: { monthly: 9900, yearly: 99000 },
    BUSINESS: { monthly: 24900, yearly: 249000 },
  };
  return prices[planId][cycle];
}
