import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { generateEan13 } from "@/lib/barcode";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { name, sku, barcode, price, cost, quantity, minStock, categoryId, supplierId, image } = body || {};

  const existing = await db.product.findFirst({ where: { organizationId: user.organizationId, sku } });
  if (existing) {
    return NextResponse.json({ error: "Ce SKU existe déjà" }, { status: 409 });
  }

  const finalBarcode = (barcode && barcode.trim()) || generateEan13();

  const product = await db.product.create({
    data: {
      name: name || "Produit",
      sku: sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
      barcode: finalBarcode,
      price: Number(price) || 0,
      cost: Number(cost) || 0,
      quantity: Number(quantity) || 0,
      minStock: Number(minStock) || 0,
      categoryId: categoryId || null,
      supplierId: supplierId || null,
      image: image || null,
      organizationId: user.organizationId,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
