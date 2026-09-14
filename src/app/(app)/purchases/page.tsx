import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PurchasesClient } from "./purchases-client";

export default async function PurchasesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [purchases, products, suppliers] = await Promise.all([
    db.purchase.findMany({
      where: { organizationId: user.organizationId },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.product.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, sku: true, price: true, cost: true, quantity: true },
      orderBy: { name: "asc" },
    }),
    db.supplier.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PurchasesClient
      purchases={purchases}
      products={products}
      suppliers={suppliers}
      currency={user.organization.settings?.currency ?? "EUR"}
    />
  );
}
