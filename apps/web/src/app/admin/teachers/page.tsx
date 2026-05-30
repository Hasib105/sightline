"use client";

import { AdminUserManagementPage } from "@/components/admin/admin-user-management-page";

export default function AdminTeachersPage() {
  return (
    <AdminUserManagementPage
      roleFilter="teacher"
      eyebrow="Admin"
      title="Teacher management"
      description="Manage teacher accounts that upload exam videos and course materials."
    />
  );
}
