"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, KeyRound, LifeBuoy, Loader2, Moon, Save, Search, Settings } from "lucide-react";

import {
  ConsolePanel,
  ConsolePage,
  StatusBadge,
} from "@/components/dashboard/console";
import { DashboardSwitch } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import { ApiError, listUserSettings, upsertUserSetting } from "@/lib/dashboard-api";

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export default function UserSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings = [], isLoading, error } = useQuery({
    queryKey: ["user-settings"],
    queryFn: listUserSettings,
  });

  const currentValues = useMemo(() => {
    const map = new Map(settings.map((entry) => [entry.key, entry.value] as const));
    return {
      asyncDefault: asBoolean(map.get("dashboard.async_default"), false),
    };
  }, [settings]);

  const [draft, setDraft] = useState<{
    asyncDefault: boolean;
  } | null>(null);
  const effectiveSettings = draft ?? currentValues;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await upsertUserSetting("dashboard.async_default", effectiveSettings.asyncDefault);
    },
    onSuccess: () => {
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });

  return (
    <ConsolePage
      eyebrow="Account"
      title="User settings"
      description="Guided defaults for the dashboard surfaces you use most."
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]">
        <ConsolePanel
          title={
            <span className="flex items-center gap-2">
              <Settings className="size-4 text-muted-foreground" />
              Playground defaults
            </span>
          }
          description="Choose the request behavior you want ready when the playground opens."
          contentClassName="space-y-3"
        >
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="p-3 text-sm text-red-600">{(error as ApiError).message}</div>
          ) : (
            <div className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--dashboard-border)] bg-background text-[var(--dashboard-accent)]">
                    <Search className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-foreground">Async search default</h2>
                      <StatusBadge label={draft ? "unsaved" : "saved"} tone={draft ? "warning" : "success"} />
                    </div>
                    <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
                      Open the playground in async job mode by default for longer searches and payloads you want to inspect later.
                    </p>
                  </div>
                </div>
                <DashboardSwitch
                  checked={effectiveSettings.asyncDefault}
                  onCheckedChange={(asyncDefault) =>
                    setDraft({
                      ...effectiveSettings,
                      asyncDefault,
                    })
                  }
                  aria-label="Run playground searches in async mode by default"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !draft}>
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save settings
          </Button>
            {draft ? (
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={saveMutation.isPending}>
                Discard
              </Button>
            ) : null}
          </div>
          {saveMutation.error ? (
            <p className="text-sm text-red-600">{(saveMutation.error as ApiError).message}</p>
          ) : null}
        </ConsolePanel>

        <div className="grid gap-3">
          <ConsolePanel title="Account shortcuts" description="Jump to the settings that affect access and billing." contentClassName="space-y-2">
            {[
              { href: "/dashboard/api-keys", label: "API keys", description: "Create, revoke, and copy credentials.", icon: KeyRound },
              { href: "/dashboard/billings", label: "Billing", description: "Review credits and subscriptions.", icon: CreditCard },
              { href: "/dashboard/support", label: "Support", description: "Send context when something feels off.", icon: LifeBuoy },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3 transition hover:border-[color-mix(in_oklab,var(--dashboard-accent)_32%,var(--dashboard-border))] hover:bg-[var(--dashboard-accent-soft)]"
                >
                  <Icon className="size-4 shrink-0 text-[var(--dashboard-accent)]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </ConsolePanel>

          <ConsolePanel title="Session preferences" description="Visual preferences live in the shell." contentClassName="space-y-3">
            <div className="flex items-start gap-3 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
              <Moon className="mt-0.5 size-4 shrink-0 text-[var(--dashboard-accent)]" />
              <div className="text-sm leading-5 text-muted-foreground">
                Theme is controlled from the top bar or user menu and is remembered for this browser.
              </div>
            </div>
          </ConsolePanel>
        </div>
      </div>
    </ConsolePage>
  );
}
