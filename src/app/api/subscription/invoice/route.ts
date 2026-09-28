import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { InvoicePdf } from "@/lib/invoice-pdf";
import { cycleLabel, formatAmount, paymentMethodLabel, planLabel } from "@/lib/payments";

/**
 * Facture PDF d'un paiement d'abonnement réussi.
 * Authentifiée et cloisonnée à l'entreprise du demandeur ; seuls les
 * paiements SUCCESS ont une facture (les autres n'ont pas été encaissés).
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const transactionId = req.nextUrl.searchParams.get("transaction");
  if (!transactionId) return NextResponse.json({ error: "transaction manquante" }, { status: 400 });

  const payment = await db.payment.findUnique({
    where: { transactionId },
    include: { organization: true },
  });
  if (!payment || payment.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  }
  if (payment.status !== "SUCCESS") {
    return NextResponse.json({ error: "Facture disponible uniquement pour un paiement validé" }, { status: 404 });
  }

  const org = payment.organization;
  const date = payment.paidAt ?? payment.createdAt;
  const dateStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const description = `Abonnement Stockkonect ${planLabel(payment.planId)}${cycleLabel(payment.cycle) ? ` - ${cycleLabel(payment.cycle)}` : ""}`;

  const doc = new InvoicePdf();
  doc.text("Stockkonect", { size: 18, bold: true, gap: 2 });
  doc.text("Facture d'abonnement", { size: 11, color: "0.35 0.35 0.45", gap: 14 });
  doc.line();

  doc.text(`Facture no : INV-${payment.transactionId}`, { bold: true });
  doc.text(`Date de paiement : ${dateStr}`, { color: "0.35 0.35 0.45" });
  doc.text(`Reference transaction : ${payment.transactionId}`, { color: "0.35 0.35 0.45" });
  if (payment.providerToken) {
    doc.text(`Identifiant CinetPay : ${payment.providerToken}`, { color: "0.35 0.35 0.45", gap: 14 });
  } else {
    doc.spacer(6);
  }

  doc.text("Client", { size: 13, bold: true });
  doc.text(org.name, { indent: 10 });
  if (org.email) doc.text(org.email, { indent: 10 });
  if (org.phone) doc.text(org.phone, { indent: 10 });
  if (org.address) doc.text(org.address, { indent: 10 });
  doc.spacer(10);

  doc.text("Détail", { size: 13, bold: true });
  doc.line();
  doc.text(description, {});
  doc.text("1 x " + formatAmount(payment.amount) + " F CFA", { indent: 10, color: "0.35 0.35 0.45" });
  doc.line();
  doc.text("Total payé : " + formatAmount(payment.amount) + " F CFA", { size: 13, bold: true });
  doc.text("Statut : PAYE", { bold: true, color: "0.1 0.5 0.3" });
  doc.text("Méthode de paiement : " + paymentMethodLabel(payment.providerMethod), {
    color: "0.35 0.35 0.45",
  });
  doc.spacer(24);

  doc.line();
  doc.text("Merci de votre confiance !", { bold: true });
  doc.text("Support Stockkonect - WhatsApp +225 07 48 32 31 91", {
    indent: 10,
    color: "0.1 0.4 0.2",
  });
  doc.text("Document généré automatiquement - stockkonect.vercel.app", {
    size: 9,
    color: "0.5 0.5 0.55",
  });

  const pdf = doc.build();
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="facture-${payment.transactionId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
