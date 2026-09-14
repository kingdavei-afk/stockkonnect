import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SimpleCrud } from "@/components/simple-crud";

export default async function SuppliersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await db.supplier.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <SimpleCrud
      title="Fournisseurs"
      description="Vos partenaires d'approvisionnement."
      endpoint="/api/suppliers"
      fields={[
        { key: "name", label: "Nom", required: true },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Téléphone", type: "tel" },
        { key: "address", label: "Adresse", type: "textarea" },
      ]}
      rows={rows.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        address: s.address,
      }))}
    />
  );
}
