import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/sidebar";
import { getCurrentUser } from "@/lib/auth-server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!(user.is_superuser || user.role === "admin")) {
    redirect("/dashboard");
  }

  return (
    <DashboardShell kind="admin" user={user}>
      {children}
    </DashboardShell>
  );
}
