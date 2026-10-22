import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildCommercialPdf } from "@/lib/commercial-pdf";

const schema = z.object({
  type: z.enum(["SALE", "QUOTE"]),
  id: z.string().min(1),
});

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Réglée",
  CANCELLED: "Annulée",
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { type, id } = parsed.data;

  const org = user.organization;
  if (!org) return NextResponse.json({ error: "Organisation introuvable" }, { status: 400 });
  const company = {
    name: org.name,
    address: org.address,
    phone: org.phone,
    email: org.email,
    taxId: org.taxId,
    bankAccount: org.bankAccount,
    mainActivities: org.mainActivities,
  };
  const currency = org.settings?.currency ?? "XOF";

  if (type === "SALE") {
    const sale = await db.sale.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: { select: { name: true } },
        items: { include: { product: { select: { name: true } } }, orderBy: { id: "asc" } },
      },
    });
    if (!sale) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });

    const pdf = buildCommercialPdf({
      type: "SALE",
      reference: sale.reference,
      date: sale.createdAt,
      company,
      customerName: sale.customer?.name ?? null,
      lines: sale.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      total: sale.total,
      currency,
      statusLabel: STATUS_LABELS[sale.status] ?? sale.status,
    });
    return pdfResponse(pdf, `facture-${sale.reference}`);
  }

  const quote = await db.quote.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      customer: { select: { name: true } },
      items: { include: { product: { select: { name: true } } }, orderBy: { id: "asc" } },
    },
  });
  if (!quote) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const pdf = buildCommercialPdf({
    type: "QUOTE",
    reference: quote.reference,
    date: quote.createdAt,
    company,
    customerName: quote.customer?.name ?? null,
    lines: quote.items.map((i) => ({
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
    total: quote.total,
    currency,
    notes: quote.notes,
    validUntil: quote.validUntil,
  });
  return pdfResponse(pdf, `devis-${quote.reference}`);
}

function pdfResponse(pdf: Buffer, name: string) {
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
