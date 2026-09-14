import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MovementsClient } from "./movements-client";

export default async function MovementsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [products, movements] = await Promise.all([
    db.product.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, sku: true, quantity: true },
      orderBy: { name: "asc" },
    }),
    db.stockMovement.findMany({
      where: { organizationId: user.organizationId },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <MovementsClient products={products} movements={movements} />
  );
}
