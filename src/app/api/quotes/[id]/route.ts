import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { blockDemoWrites } from "@/lib/demo-access";
import { z } from "zod";

function makeRef(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(
    Math.random() * 90 + 10
  )}`;
}

const quoteItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantité invalide"),
  unitPrice: z.coerce.number().min(0, "Prix invalide"),
});

const quoteSchema = z.object({
  customerId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  validUntil: z.string().optional().nullable(),
  items: z.array(quoteItemSchema).min(1, "Ajoutez au moins un article"),
});

const itemInclude = {
  product: { select: { name: true, sku: true } },
} as const;

const STATUSES = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const demoBlocked = blockDemoWrites(user);
  if (demoBlocked) return demoBlocked;
  const { id } = await params;

  const existing = await db.quote.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);

  // Changement de statut seul
  if (body && !body.items) {
    const status = String(body.status ?? "");
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    const quote = await db.quote.update({
      where: { id: existing.id },
      data: { status },
      include: {
        customer: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
    });
    return NextResponse.json(quote);
  }

  // Modification du contenu (lignes, client, notes, validité)
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const { customerId, notes, validUntil, items } = parsed.data;

  const productIds = [...new Set(items.map((i) => i.productId))];
  const [customerCount, productCount] = await Promise.all([
    customerId
      ? db.customer.count({ where: { id: customerId, organizationId: user.organizationId } })
      : 0,
    db.product.count({
      where: { id: { in: productIds }, organizationId: user.organizationId },
    }),
  ]);
  if ((customerId && customerCount !== 1) || productCount !== productIds.length) {
    return NextResponse.json({ error: "Client ou produit introuvable" }, { status: 404 });
  }

  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const quote = await db.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: existing.id } });
    return tx.quote.update({
      where: { id: existing.id },
      data: {
        total,
        notes: notes || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        customerId: customerId || null,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: {
        customer: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
    });
  });
  return NextResponse.json(quote);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const demoBlocked = blockDemoWrites(user);
  if (demoBlocked) return demoBlocked;
  const { id } = await params;

  const deleted = await db.quote.deleteMany({
    where: { id, organizationId: user.organizationId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
