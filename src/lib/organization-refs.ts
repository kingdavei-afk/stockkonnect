import type { Prisma } from "@prisma/client";

type ReferenceClient = Pick<Prisma.TransactionClient, "category" | "supplier" | "customer">;

/** Confirms every optional reference belongs to the active organization. */
export async function referencesBelongToOrganization(
  client: ReferenceClient,
  organizationId: string,
  refs: { categoryId?: string | null; supplierId?: string | null; customerId?: string | null }
): Promise<boolean> {
  const checks: Promise<number>[] = [];
  if (refs.categoryId) checks.push(client.category.count({ where: { id: refs.categoryId, organizationId } }));
  if (refs.supplierId) checks.push(client.supplier.count({ where: { id: refs.supplierId, organizationId } }));
  if (refs.customerId) checks.push(client.customer.count({ where: { id: refs.customerId, organizationId } }));
  const counts = await Promise.all(checks);
  return counts.every((count) => count === 1);
}
