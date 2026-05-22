import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth-server";

export default async function DashboardAdminLayout({
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

  return children;
}
