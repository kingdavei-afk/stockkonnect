import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SalesClient } from "./sales-client";

export default async function SalesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [sales, products, customers] = await Promise.all([
    db.sale.findMany({
      where: { organizationId: user.organizationId },
      include: {
        customer: { select: { name: true } },
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
    db.customer.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const org = user.organization;
  return (
    <SalesClient
      sales={sales}
      products={products}
      customers={customers}
      currency={org.settings?.currency ?? "EUR"}
      company={{
        name: org.name,
        address: org.address,
        phone: org.phone,
        email: org.email,
        taxId: org.taxId,
      }}
    />
  );
}
