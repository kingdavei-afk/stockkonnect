import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAccount, isSuperAdmin } from "@/lib/auth";
import { formatAmount, paymentMethodLabel, planLabel } from "@/lib/payments";

function firstOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function iso(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Période avancée : nombre de jours en arrière à partir d'aujourd'hui. */
function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const account = await getSessionAccount();
  if (!isSuperAdmin(account)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const searchParams = req.nextUrl.searchParams;
  const period = searchParams.get("period");
  const status = searchParams.get("status") ?? "ALL";

  let since: Date;
  if (period) {
    const days = Number.parseInt(period, 10);
    if (Number.isFinite(days) && days > 0) {
      since = daysAgo(days);
    } else {
      since = daysAgo(30);
    }
  } else {
    since = daysAgo(30);
  }

  const allowedStatus = status === "ALL" || ["SUCCESS", "PENDING", "FAILED"].includes(status)
    ? status
    : "ALL";

  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    where: {
      status: allowedStatus === "ALL" ? undefined : allowedStatus,
      paidAt: since <= new Date() ? { gte: since } : undefined,
    },
    include: {
      organization: { select: { name: true } },
    },
  });

  const rows = [
    ["Transaction", "Entreprise", "Offre", "Mois", "Par mois", "Montant (F CFA)", "Statut", "Méthode", "Payé le", "Créé le"],
    ...payments.map((p) => [
      p.transactionId,
      csvEscape(p.organization?.name ?? "—"),
      planLabel(p.planId),
      p.cycle,
      formatAmount(p.amount),
      p.status,
      paymentMethodLabel(p.providerMethod),
      p.paidAt ? new Date(p.paidAt).toLocaleString("fr-FR") : "—",
      p.createdAt.toLocaleString("fr-FR"),
    ]),
  ];

  const csv = rows.map((r) => r.map((c) => csvEscape(c)).join(";")).join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stockkonect-payments-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST() {
  const account = await getSessionAccount();
  if (!isSuperAdmin(account)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: { organization: { select: { name: true } } },
  });

  await db.$executeRaw`TRUNCATE TABLE "Payment" RESTART IDENTITY CASCADE`;
  await db.$executeRaw`ALTER SEQUENCE "Payment_id_seq" RESTART WITH 1`;

  for (const p of payments) {
    await db.payment.create({
      data: {
        transactionId: p.transactionId,
        organizationId: p.organizationId,
        provider: p.provider,
        amount: p.amount,
        currency: p.currency,
        cycle: p.cycle,
        planId: p.planId,
        status: p.status,
        providerToken: p.providerToken,
        providerMethod: p.providerMethod,
        metadata: p.metadata,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      },
    });
  }

  return NextResponse.json({ ok: true, count: payments.length });
}
