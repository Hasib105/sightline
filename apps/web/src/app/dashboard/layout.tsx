import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { getCurrentUser } from "@/lib/auth-server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell kind="dashboard" user={user}>
      {children}
    </DashboardShell>
  );
}
