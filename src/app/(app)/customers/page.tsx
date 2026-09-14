import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SimpleCrud } from "@/components/simple-crud";

export default async function CustomersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await db.customer.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <SimpleCrud
      title="Clients"
      description="Répertoire de vos clients et leurs coordonnées."
      endpoint="/api/customers"
      fields={[
        { key: "name", label: "Nom", required: true },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Téléphone", type: "tel" },
        { key: "address", label: "Adresse", type: "textarea" },
      ]}
      rows={rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
      }))}
    />
  );
}
