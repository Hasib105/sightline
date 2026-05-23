"use client";

import { AdminUserManagementPage } from "@/components/admin/admin-user-management-page";

export default function AdminInvigilatorsPage() {
  return (
    <AdminUserManagementPage
      roleFilter="invigilator"
      eyebrow="Admin"
      title="Invigilator management"
      description="Manage invigilator accounts that upload exam videos and review alert evidence."
    />
  );
}
