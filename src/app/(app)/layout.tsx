import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      userName={user.name}
      organizationName={user.organization.name}
      role={user.role}
      logout={<LogoutButton />}
    >
      {children}
    </AppShell>
  );
}
