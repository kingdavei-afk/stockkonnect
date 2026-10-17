import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { blockDemoWrites } from "@/lib/demo-access";

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

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const quotes = await db.quote.findMany({
    where: { organizationId: user.organizationId },
    include: {
      customer: { select: { name: true } },
      items: { include: itemInclude },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const demoBlocked = blockDemoWrites(user);
  if (demoBlocked) return demoBlocked;

  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
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
  const quote = await db.quote.create({
    data: {
      reference: makeRef("DEV"),
      status: "DRAFT",
      total,
      notes: notes || null,
      validUntil: validUntil ? new Date(validUntil) : null,
      customerId: customerId || null,
      organizationId: user.organizationId,
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      },
    },
    include: { customer: { select: { name: true } }, items: { include: itemInclude } },
  });

  return NextResponse.json(quote, { status: 201 });
}
