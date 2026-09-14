import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const productSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  sku: z.string().min(1, "SKU requis"),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "Prix invalide"),
  cost: z.coerce.number().min(0, "Coût invalide"),
  quantity: z.coerce.number().int().min(0, "Quantité invalide"),
  minStock: z.coerce.number().int().min(0, "Seuil invalide"),
  image: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const products = await db.product.findMany({
    where: { organizationId: user.organizationId },
    include: { category: true, supplier: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Limite de produits selon l'offre (maxProducts null = illimité)
  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { maxProducts: true, plan: true },
  });
  if (org?.maxProducts != null) {
    const count = await db.product.count({ where: { organizationId: user.organizationId } });
    if (count >= org.maxProducts) {
      return NextResponse.json(
        { error: `Limite de ${org.maxProducts} produits atteinte avec l'offre ${org.plan === "PRO" ? "Pro" : "Gratuit"}. Passez à l'offre Business pour des produits illimités.` },
        { status: 402 }
      );
    }
  }

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const duplicate = await db.product.findFirst({
    where: { organizationId: user.organizationId, sku: data.sku },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Ce SKU existe déjà" }, { status: 409 });
  }

  const product = await db.product.create({
    data: {
      ...data,
      barcode: data.barcode || null,
      description: data.description || null,
      image: data.image || null,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
      organizationId: user.organizationId,
    },
  });

  if (data.quantity > 0) {
    await db.stockMovement.create({
      data: {
        type: "IN",
        quantity: data.quantity,
        note: "Stock initial",
        productId: product.id,
        userId: user.id,
        organizationId: user.organizationId,
      },
    });
  }

  return NextResponse.json(product, { status: 201 });
}
