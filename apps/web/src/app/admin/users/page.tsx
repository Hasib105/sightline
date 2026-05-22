"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, UserPlus } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  DataTable,
  StatusBadge,
  consoleInputClass,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import { ApiError, createAdminUser, listAdminUsers, setAdminUserPassword, updateAdminUser } from "@/lib/dashboard-api";
import type { AdminUserSummary } from "@/lib/types";

const roleOptions = [
  { value: "admin", label: "admin" },
  { value: "teacher", label: "teacher" },
  { value: "invigilator", label: "invigilator" },
  { value: "student", label: "student" },
] as const;

const initialDraft = {
  username: "",
  email: "",
  password: "sightline",
  role: "student",
};

function roleTone(role: string): "success" | "warning" | "muted" {
  if (role === "admin") return "warning";
  if (role === "invigilator") return "success";
  return "muted";
}

function RoleSelect({ user }: { user: AdminUserSummary }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (role: string) => updateAdminUser(user.id, { role }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <DashboardSelect
      name={`role-${user.id}`}
      value={user.role}
      disabled={mutation.isPending}
      onValueChange={(role) => mutation.mutate(role)}
      options={[...roleOptions]}
    />
  );
}

function PasswordSetter({ user }: { user: AdminUserSummary }) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => setAdminUserPassword(user.id, password),
    onSuccess: () => {
      setPassword("");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <div className="flex min-w-[16rem] gap-2">
      <input
        className={consoleInputClass}
        type="password"
        placeholder="New password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button size="icon-sm" disabled={password.length < 8 || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      </Button>
    </div>
  );
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initialDraft);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: listAdminUsers,
  });

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      setDraft(initialDraft);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate({
      username: draft.username.trim(),
      email: draft.email.trim(),
      password: draft.password,
      role: draft.role,
      is_active: true,
    });
  }

  const users = usersQuery.data ?? [];

  return (
    <ConsolePage
      eyebrow="Admin"
      title="MVP users"
      description="Manage the four Sightline MVP roles: admin, teacher, student, and invigilator."
      meta={<span>{users.length} users loaded</span>}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ConsolePanel title="Seeded users" description="Role and password management for local MVP testing.">
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : usersQuery.error ? (
            <p className="text-sm text-red-600">{(usersQuery.error as ApiError).message}</p>
          ) : users.length === 0 ? (
            <ConsoleEmptyState title="No users found" description="Run npm run api:seed to create demo users." />
          ) : (
            <DataTable containerClassName="max-h-[620px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>User</th>
                  <th className={consoleTableHeaderCellClass}>Role</th>
                  <th className={consoleTableHeaderCellClass}>Status</th>
                  <th className={consoleTableHeaderCellClass}>Set Password</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/40">
                    <td className={consoleTableCellClass}>
                      <div className="font-medium text-foreground">{user.username}</div>
                      <div className="text-xs text-muted-foreground">{user.email ?? "No email"}</div>
                    </td>
                    <td className={consoleTableCellClass}>
                      <div className="flex min-w-[12rem] items-center gap-2">
                        <StatusBadge label={user.role} tone={roleTone(user.role)} />
                        <RoleSelect user={user} />
                      </div>
                    </td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge label={user.is_active ? "active" : "disabled"} tone={user.is_active ? "success" : "muted"} />
                    </td>
                    <td className={consoleTableCellClass}>
                      <PasswordSetter user={user} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </ConsolePanel>

        <ConsolePanel title="Create user" description="Use password sightline for quick local accounts.">
          <form className="space-y-3" onSubmit={submitCreateUser}>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Username</span>
              <input
                className={consoleInputClass}
                value={draft.username}
                onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Email</span>
              <input
                className={consoleInputClass}
                type="email"
                value={draft.email}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Password</span>
              <input
                className={consoleInputClass}
                type="password"
                minLength={8}
                value={draft.password}
                onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Role</span>
              <DashboardSelect
                name="new-user-role"
                value={draft.role}
                onValueChange={(role) => setDraft((current) => ({ ...current, role }))}
                options={[...roleOptions]}
              />
            </label>
            <Button className="w-full" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Create user
            </Button>
            {createMutation.error ? (
              <p className="text-sm text-red-600">{(createMutation.error as ApiError).message}</p>
            ) : null}
          </form>
        </ConsolePanel>
      </div>
    </ConsolePage>
  );
}
