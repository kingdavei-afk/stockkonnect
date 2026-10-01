import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.role !== "ADMIN") {
    return (
      <div>
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Seuls les administrateurs peuvent gérer les utilisateurs.
        </p>
      </div>
    );
  }

  const users = await db.user.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { maxUsers: true, plan: true },
  });

  return (
    <UsersClient
      currentUserId={user.id}
      maxUsers={org?.maxUsers ?? 2}
      plan={org?.plan ?? "GRATUIT"}
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
