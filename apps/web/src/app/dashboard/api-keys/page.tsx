"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Key as KeyIcon, Loader2, Plus, Trash2 } from "lucide-react";

import {
  ConsolePage,
  ConsolePanel,
  DataTable,
  EmptyTableState,
  FilterBar,
  KeyValueList,
  StatusBadge,
  Toolbar,
  consoleInputClass,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button, buttonVariants } from "@/components/ui/button";
import { ApiError, createApiKey, listApiKeys, revokeApiKey } from "@/lib/dashboard-api";
import { ApiKeyCreated } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [drawerMode, setDrawerMode] = useState<"notes" | "key" | null>(null);

  const { data: keys = [], isLoading, error } = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (created) => {
      setNewKey(created);
      setDrawerMode("key");
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    createMutation.mutate(trimmedName);
  };

  const handleRevoke = (id: number) => {
    if (!confirm("Are you sure you want to revoke this API key?")) {
      return;
    }
    revokeMutation.mutate(id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ConsolePage
      eyebrow="Build"
      title="API keys"
      description="Create, rotate, and revoke credentials from a dense inventory view."
      meta={<span>{keys.length} keys in this workspace</span>}
      actions={
        <Button variant="outline" size="sm" onClick={() => setDrawerMode("notes")}>
          <KeyIcon className="size-4" />
          Creation notes
        </Button>
      }
    >
      <div className="space-y-3">
        <ConsolePanel title="Credential inventory" description="Active and revoked workspace keys." contentClassName="space-y-2">
          <FilterBar className="justify-between">
            <form onSubmit={handleCreate} className="flex flex-1 flex-wrap items-center gap-2">
              <input
                className={cn(consoleInputClass, "max-w-[260px]")}
                name="api-key-label"
                placeholder="New key label"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={createMutation.isPending}
              />
              <Button type="submit" size="xs" disabled={createMutation.isPending || !name.trim()}>
                {createMutation.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 size-3.5" />
                )}
                Create key
              </Button>
            </form>
            <div className="text-[11px] text-slate-500">Raw key appears once, then only prefix is shown.</div>
          </FilterBar>

          {isLoading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{(error as ApiError).message}</p>
          ) : keys.length === 0 ? (
            <EmptyTableState
              title="No API keys yet"
              description="Create a key to start using the operations platform programmatically."
              icon={KeyIcon}
            />
          ) : (
            <DataTable containerClassName="max-h-[540px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Name</th>
                  <th className={consoleTableHeaderCellClass}>Prefix</th>
                  <th className={consoleTableHeaderCellClass}>Status</th>
                  <th className={consoleTableHeaderCellClass}>Rate limit</th>
                  <th className={consoleTableHeaderCellClass}>Created</th>
                  <th className={consoleTableHeaderCellClass}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50">
                    <td className={cn(consoleTableCellClass, "font-medium text-slate-900")}>{key.name}</td>
                    <td className={cn(consoleTableCellClass, "font-mono text-xs text-slate-500")}>
                      {key.key_prefix}...
                    </td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge label={key.is_active ? "active" : "revoked"} tone={key.is_active ? "success" : "muted"} />
                    </td>
                    <td className={consoleTableCellClass}>{key.rate_limit_per_minute}/min</td>
                    <td className={cn(consoleTableCellClass, "text-slate-500")}>
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className={consoleTableCellClass}>
                      {key.is_active ? (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleRevoke(key.id)}
                          disabled={revokeMutation.isPending}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400">read only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
          {revokeMutation.error ? (
            <p className="text-sm text-red-600">{(revokeMutation.error as ApiError).message}</p>
          ) : null}
          {createMutation.error ? (
            <p className="text-sm text-red-600">{(createMutation.error as ApiError).message}</p>
          ) : null}
        </ConsolePanel>

        <InspectorDrawer
          open={drawerMode !== null}
          onOpenChange={(open) => setDrawerMode(open ? drawerMode ?? "notes" : null)}
          title={drawerMode === "key" ? "New API key" : "Creation notes"}
          description={drawerMode === "key" ? "Copy this value now. It will not be shown again." : "What to expect when issuing a credential."}
        >
          {drawerMode === "key" && newKey ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-emerald-800">{newKey.name}</p>
                  <p className="mt-1 break-all font-mono text-xs text-emerald-900">{newKey.raw_key}</p>
                </div>
                <Toolbar className="shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newKey.raw_key)}
                    className={cn(buttonVariants({ variant: "outline", size: "xs" }), "border-emerald-300 bg-white")}
                  >
                    {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <Button size="xs" onClick={() => {
                    setNewKey(null);
                    setDrawerMode(null);
                  }}>
                    Done
                  </Button>
                </Toolbar>
              </div>
            </div>
          ) : (
            <KeyValueList
              items={[
                { label: "Visibility", value: "Raw key is shown once immediately after creation." },
                { label: "Revocation", value: "Revoked keys stay in inventory for audit history." },
                { label: "Usage", value: "Keys can be used for API calls and MCP clients." },
              ]}
            />
          )}
        </InspectorDrawer>
      </div>
    </ConsolePage>
  );
}
