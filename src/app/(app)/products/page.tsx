import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [products, categories, suppliers] = await Promise.all([
    db.product.findMany({
      where: { organizationId: user.organizationId },
      include: { category: true, supplier: true },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
    db.supplier.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ProductsClient
      products={products}
      categories={categories}
      suppliers={suppliers}
      currency={user.organization.settings?.currency ?? "EUR"}
    />
  );
}
