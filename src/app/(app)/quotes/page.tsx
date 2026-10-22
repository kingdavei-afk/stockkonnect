import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QuotesClient } from "./quotes-client";

export default async function QuotesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [quotes, products, customers] = await Promise.all([
    db.quote.findMany({
      where: { organizationId: user.organizationId },
      include: {
        customer: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.product.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, sku: true, price: true, quantity: true },
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
    <QuotesClient
      quotes={quotes.map((q) => ({
        ...q,
        createdAt: q.createdAt.toISOString(),
        validUntil: q.validUntil?.toISOString() ?? null,
      }))}
      products={products}
      customers={customers}
      currency={org.settings?.currency ?? "XOF"}
      company={{
        name: org.name,
        address: org.address,
        phone: org.phone,
        email: org.email,
        taxId: org.taxId,
        bankAccount: org.bankAccount,
        mainActivities: org.mainActivities,
      }}
    />
  );
}
