import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SimpleCrud } from "@/components/simple-crud";

export default async function CategoriesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await db.category.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <SimpleCrud
      title="Catégories"
      description="Organisez vos produits par famille."
      endpoint="/api/categories"
      fields={[{ key: "name", label: "Nom", required: true }]}
      rows={rows.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
