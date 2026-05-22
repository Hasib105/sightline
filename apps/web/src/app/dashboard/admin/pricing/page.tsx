"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, Loader2, Plus, Save, Settings2, Trash2 } from "lucide-react";

import {
  ConsolePage,
  ConsolePanel,
  consoleTextareaClass,
} from "@/components/dashboard/console";
import { DashboardSelect, DashboardSwitch } from "@/components/dashboard/form-controls";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  createAdminPlan,
  deleteAdminPlan,
  listAdminPlans,
  listSystemSettings,
  upsertSystemSetting,
  updateAdminPlan,
} from "@/lib/dashboard-api";
import { normalizePlanMetadata } from "@/lib/pricing";
import { JsonValue } from "@/lib/types";

type PlanFormState = {
  code: string;
  name: string;
  description: string;
  credits: string;
  unit_amount_cents: string;
  currency: string;
  stripe_price_id: string;
  stripe_product_id: string;
  is_active: boolean;
  billing_type: "payment" | "subscription";
  interval: "" | "day" | "week" | "month" | "year";
  featured: boolean;
  badge: string;
  cta_label: string;
  cost_per_credit: string;
  value_increase: string;
  custom_engines_enabled: boolean;
  allowedEnginesText: string;
  max_qps: string;
  featuresText: string;
};

const BUILTIN_FREE_PLAN_CREDITS = 3000;
const DEFAULT_CREDIT_POLICY = {
  credit_value_usd: 0.005,
  free: {
    signup_bonus_credits: 2500,
    signup_bonus_expiry_days: 90,
    monthly_free_credits: 500,
    monthly_rollover: false,
  },
  operations: {
    "search.basic": { base: 1 },
    "search.expanded.50": { base: 2 },
    "search.expanded.100": { base: 3 },
    "fetch.markdown": { per_url: 1 },
    "fetch.rendered": { per_url: 3 },
    "compress.compact": { per_50k_chars: 1 },
    "compress.caveman": { per_100k_chars: 1 },
    "deep.search": { base: 10, default_max_credits: 50 },
  },
};

const emptyPlan: PlanFormState = {
  code: "",
  name: "",
  description: "",
  credits: "0",
  unit_amount_cents: "0",
  currency: "usd",
  stripe_price_id: "",
  stripe_product_id: "",
  is_active: true,
  billing_type: "subscription",
  interval: "month",
  featured: false,
  badge: "",
  cta_label: "",
  cost_per_credit: "",
  value_increase: "",
  custom_engines_enabled: false,
  allowedEnginesText: "sail",
  max_qps: "1",
  featuresText: "",
};

function toPlanPayload(
  form: PlanFormState,
  baseMetadata: Record<string, JsonValue> = {}
): Record<string, JsonValue> {
  const features = form.featuresText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedEngines = form.allowedEnginesText
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    code: form.code.trim().toLowerCase(),
    name: form.name.trim(),
    description: form.description.trim(),
    credits: Number(form.credits) || 0,
    unit_amount_cents: Number(form.unit_amount_cents) || 0,
    currency: form.currency.trim().toLowerCase() || "usd",
    stripe_price_id: form.stripe_price_id.trim() || null,
    stripe_product_id: form.stripe_product_id.trim() || null,
    is_active: form.is_active,
    metadata: {
      ...baseMetadata,
      billing_type: form.billing_type,
      interval: form.interval,
      featured: form.featured,
      badge: form.badge.trim(),
      cta_label: form.cta_label.trim(),
      cost_per_credit: form.cost_per_credit.trim(),
      value_increase: form.value_increase.trim(),
      custom_engines_enabled: form.custom_engines_enabled,
      allowed_engines: allowedEngines.length ? allowedEngines : ["sail"],
      max_qps: Number(form.max_qps) || 1,
      features,
    },
  };
}

function asJsonString(value: JsonValue | undefined, fallback: string): string {
  if (value === undefined) {
    return fallback;
  }
  return JSON.stringify(value, null, 2);
}

export default function AdminPricingPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyPlan);
  const [settingsDraft, setSettingsDraft] = useState({
    creditPolicyJson: JSON.stringify(DEFAULT_CREDIT_POLICY, null, 2),
    freePlanEnabled: "true",
    adminBypass: "true",
  });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [formError, setFormError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const plansQuery = useQuery({
    queryKey: ["admin-pricing-plans"],
    queryFn: listAdminPlans,
  });

  const settingsQuery = useQuery({
    queryKey: ["admin-pricing-settings"],
    queryFn: listSystemSettings,
  });

  const plans = useMemo(() => {
    return (plansQuery.data ?? []).map((record) => {
      const metadata =
        record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
          ? normalizePlanMetadata(record.metadata as Record<string, JsonValue>)
          : normalizePlanMetadata({});
      return {
        id: Number(record.id),
        code: String(record.code ?? ""),
        name: String(record.name ?? ""),
        description: String(record.description ?? ""),
        credits: Number(record.credits ?? 0),
        unit_amount_cents: Number(record.unit_amount_cents ?? 0),
        currency: String(record.currency ?? "usd"),
        stripe_price_id: record.stripe_price_id ? String(record.stripe_price_id) : "",
        stripe_product_id: record.stripe_product_id ? String(record.stripe_product_id) : "",
        is_active: record.is_active,
        metadata,
      };
    });
  }, [plansQuery.data]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  const settingsDefaults = useMemo(() => {
    const map = new Map((settingsQuery.data ?? []).map((entry) => [entry.key, entry.value] as const));
    return {
      creditPolicyJson: asJsonString(
        map.get("billing.credit_policy"),
        JSON.stringify(DEFAULT_CREDIT_POLICY, null, 2)
      ),
      freePlanEnabled: String(map.get("billing.free_plan_enabled") ?? true),
      adminBypass: String(map.get("billing.admin_bypass") ?? true),
    };
  }, [settingsQuery.data]);

  const effectiveSettingsDraft = settingsDirty ? settingsDraft : settingsDefaults;

  const effectiveSearchCost = useMemo(() => {
    try {
      const parsed = JSON.parse(effectiveSettingsDraft.creditPolicyJson) as JsonValue;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const operations = (parsed as Record<string, JsonValue>).operations;
        if (operations && typeof operations === "object" && !Array.isArray(operations)) {
          const basic = (operations as Record<string, JsonValue>)["search.basic"];
          if (basic && typeof basic === "object" && !Array.isArray(basic)) {
            const base = (basic as Record<string, JsonValue>).base;
            return typeof base === "number" ? base : 1;
          }
        }
      }
      return 1;
    } catch {
      return 1;
    }
  }, [effectiveSettingsDraft.creditPolicyJson]);

  const freePlanIncludedSearches = Math.floor(
    BUILTIN_FREE_PLAN_CREDITS / Math.max(effectiveSearchCost, 1)
  );

  const createPlanMutation = useMutation({
    mutationFn: (payload: Record<string, JsonValue>) => createAdminPlan(payload),
    onSuccess: () => {
      setForm(emptyPlan);
      setSelectedPlanId(null);
      setFormError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ recordId, payload }: { recordId: number; payload: Record<string, JsonValue> }) =>
      updateAdminPlan(recordId, payload),
    onSuccess: () => {
      setFormError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (recordId: number) => deleteAdminPlan(recordId),
    onSuccess: () => {
      setSelectedPlanId(null);
      setForm(emptyPlan);
      void queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
    },
  });

  const saveSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: JsonValue }) => upsertSystemSetting(key, value),
    onSuccess: () => {
      setSettingsError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-pricing-settings"] });
    },
  });

  const loadPlan = (planId: number) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) {
      return;
    }
    setSelectedPlanId(plan.id);
    setDrawerOpen(true);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      credits: String(plan.credits),
      unit_amount_cents: String(plan.unit_amount_cents),
      currency: plan.currency,
      stripe_price_id: plan.stripe_price_id,
      stripe_product_id: plan.stripe_product_id,
      is_active: plan.is_active,
      billing_type: plan.metadata.billing_type,
      interval: plan.metadata.interval,
      featured: plan.metadata.featured,
      badge: plan.metadata.badge,
      cta_label: plan.metadata.cta_label,
      cost_per_credit: plan.metadata.cost_per_credit,
      value_increase: plan.metadata.value_increase,
      custom_engines_enabled: plan.metadata.custom_engines_enabled,
      allowedEnginesText: plan.metadata.allowed_engines.join("\n") || "sail",
      max_qps:
        typeof plan.metadata.max_qps === "number" ? String(plan.metadata.max_qps) : "1",
      featuresText: plan.metadata.features.join("\n"),
    });
  };

  const savePlan = () => {
    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Plan code and name are required.");
      return;
    }
    if (form.billing_type === "subscription" && !form.interval) {
      setFormError("Subscription plans need a billing interval.");
      return;
    }

    const payload = toPlanPayload(form, selectedPlan?.metadata as Record<string, JsonValue> | undefined);
    if (selectedPlanId) {
      updatePlanMutation.mutate({ recordId: selectedPlanId, payload });
      return;
    }
    createPlanMutation.mutate(payload);
  };

  const updateSettingsDraft = (
    patch: Partial<{
      creditPolicyJson: string;
      freePlanEnabled: string;
      adminBypass: string;
    }>
  ) => {
    setSettingsDirty(true);
    setSettingsDraft((current) => ({
      ...(settingsDirty ? current : effectiveSettingsDraft),
      ...patch,
    }));
  };

  const saveSettings = () => {
    try {
      const creditPolicy = JSON.parse(effectiveSettingsDraft.creditPolicyJson) as JsonValue;
      const freePlanEnabled = effectiveSettingsDraft.freePlanEnabled.trim().toLowerCase() === "true";
      const adminBypass = effectiveSettingsDraft.adminBypass.trim().toLowerCase() === "true";

      saveSettingMutation.mutate({ key: "billing.credit_policy", value: creditPolicy });
      saveSettingMutation.mutate({ key: "billing.free_plan_enabled", value: freePlanEnabled });
      saveSettingMutation.mutate({ key: "billing.admin_bypass", value: adminBypass });
      setSettingsDirty(false);
    } catch {
      setSettingsError("Billing settings contain invalid JSON.");
    }
  };

  const isSavingPlan = createPlanMutation.isPending || updatePlanMutation.isPending;

  return (
    <ConsolePage
      eyebrow="Operations"
      title="Pricing"
      description="Create subscription plans, manage monthly credit resets, and tune global billing behavior."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedPlanId(null);
            setForm(emptyPlan);
            setFormError("");
            setDrawerOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          New plan
        </Button>
      }
    >

      <div className="min-w-0 space-y-3">
        <div className="min-w-0 space-y-6">
          <ConsolePanel
            className="min-w-0"
            title={
              <span className="flex items-center gap-2 text-base">
                <BadgeDollarSign className="size-4 text-slate-500" />
                Pricing plans
              </span>
            }
            contentClassName="space-y-3"
          >
              {plansQuery.isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="size-6 animate-spin text-slate-400" />
                </div>
              ) : plansQuery.error ? (
                <p className="text-sm text-red-600">{(plansQuery.error as ApiError).message}</p>
              ) : plans.length === 0 ? (
                <p className="text-sm text-slate-500">No pricing plans yet. Create the first subscription plan here.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => loadPlan(plan.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selectedPlanId === plan.id
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-500">{plan.code}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            plan.metadata.billing_type === "subscription"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {plan.metadata.billing_type === "subscription" ? "Subscription" : "Legacy"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-500">{plan.description || "No description yet."}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {plan.unit_amount_cents / 100} {plan.currency.toUpperCase()}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {plan.credits} credits
                        </span>
                        {plan.metadata.cost_per_credit ? (
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {plan.metadata.cost_per_credit} / credit
                          </span>
                        ) : null}
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {plan.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </ConsolePanel>

          <ConsolePanel className="min-w-0" title="Built-in free plan" contentClassName="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Free</p>
                    <p className="text-sm text-slate-500">
                      Launch credits plus monthly free credits, controlled by credit policy.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      effectiveSettingsDraft.freePlanEnabled === "true"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {effectiveSettingsDraft.freePlanEnabled === "true" ? "Enabled" : "Hidden"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-white px-2 py-1">
                    {BUILTIN_FREE_PLAN_CREDITS} credits
                  </span>
                  <span className="rounded-full bg-white px-2 py-1">
                    {freePlanIncludedSearches} basic searches at {effectiveSearchCost} credit/search
                  </span>
                  <span className="rounded-full bg-white px-2 py-1">
                    Up to 10 results per search
                  </span>
                </div>
              </div>
          </ConsolePanel>

          <ConsolePanel
            className="min-w-0"
            title={
              <span className="flex items-center gap-2 text-base">
                <Settings2 className="size-4 text-slate-500" />
                Billing settings
              </span>
            }
            contentClassName="grid gap-4 md:grid-cols-2"
          >
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Admin bypass</span>
                <DashboardSelect
                  value={effectiveSettingsDraft.adminBypass}
                  onValueChange={(adminBypass) => updateSettingsDraft({ adminBypass })}
                  options={[
                    { value: "true", label: "true" },
                    { value: "false", label: "false" },
                  ]}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Show free plan</span>
                <DashboardSelect
                  value={effectiveSettingsDraft.freePlanEnabled}
                  onValueChange={(freePlanEnabled) => updateSettingsDraft({ freePlanEnabled })}
                  options={[
                    { value: "true", label: "true" },
                    { value: "false", label: "false" },
                  ]}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Credit policy JSON</span>
                <textarea
                  className={`${consoleTextareaClass} min-h-[140px] font-mono text-xs`}
                  value={effectiveSettingsDraft.creditPolicyJson}
                  onChange={(event) =>
                    updateSettingsDraft({ creditPolicyJson: event.target.value })
                  }
                />
                <p className="text-xs text-slate-500">
                  Controls operation prices, launch credits, monthly credits, deep-search caps, and
                  custom-engine surcharges. The quote simulator uses the same policy.
                </p>
              </label>
              <div className="md:col-span-2">
                <Button onClick={saveSettings} disabled={saveSettingMutation.isPending}>
                  {saveSettingMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  Save settings
                </Button>
              </div>
          </ConsolePanel>
        </div>

        <InspectorDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={
            <span className="text-base">
              {selectedPlan ? `Edit ${selectedPlan.name}` : "Create pricing plan"}
            </span>
          }
          bodyClassName="space-y-4"
        >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Code</span>
                <Input
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                  placeholder="starter-monthly"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Starter Monthly"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  className={`${consoleTextareaClass} min-h-[96px]`}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Amount in cents</span>
                <Input
                  type="number"
                  min={0}
                  value={form.unit_amount_cents}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unit_amount_cents: event.target.value }))
                  }
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Credits reset each month</span>
                <Input
                  type="number"
                  min={0}
                  value={form.credits}
                  onChange={(event) => setForm((current) => ({ ...current, credits: event.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Currency</span>
                <Input
                  value={form.currency}
                  onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                  placeholder="usd"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Stripe price ID</span>
                <Input
                  value={form.stripe_price_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stripe_price_id: event.target.value }))
                  }
                  readOnly
                  placeholder="price_..."
                />
                <p className="text-xs text-slate-500">Generated automatically in Stripe when you save.</p>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Stripe product ID</span>
                <Input
                  value={form.stripe_product_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stripe_product_id: event.target.value }))
                  }
                  readOnly
                  placeholder="prod_..."
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Billing type</span>
                <DashboardSelect
                  value={form.billing_type}
                  onValueChange={(billingType) =>
                    setForm((current) => ({
                      ...current,
                      billing_type: billingType as PlanFormState["billing_type"],
                    }))
                  }
                  options={[{ value: "subscription", label: "Subscription" }]}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Interval</span>
                <DashboardSelect
                  value={form.interval}
                  onValueChange={(interval) =>
                    setForm((current) => ({
                      ...current,
                      interval: interval as PlanFormState["interval"],
                    }))
                  }
                  options={[
                    { value: "", label: "None" },
                    { value: "day", label: "Day" },
                    { value: "week", label: "Week" },
                    { value: "month", label: "Month" },
                    { value: "year", label: "Year" },
                  ]}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Badge</span>
                <Input
                  value={form.badge}
                  onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))}
                  placeholder="Most popular"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">CTA label</span>
                <Input
                  value={form.cta_label}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cta_label: event.target.value }))
                  }
                  placeholder="Start subscription"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Cost per credit</span>
                <Input
                  value={form.cost_per_credit}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cost_per_credit: event.target.value }))
                  }
                  placeholder="$0.00066"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Value increase</span>
                <Input
                  value={form.value_increase}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, value_increase: event.target.value }))
                  }
                  placeholder="+15% Bonus"
                />
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5">
                <DashboardSwitch
                  checked={form.is_active}
                  onCheckedChange={(isActive) => setForm((current) => ({ ...current, is_active: isActive }))}
                  aria-label="Active"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5">
                <DashboardSwitch
                  checked={form.featured}
                  onCheckedChange={(featured) => setForm((current) => ({ ...current, featured }))}
                  aria-label="Featured on pricing page"
                />
                <span className="text-sm font-medium text-slate-700">Featured on pricing page</span>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5">
                <DashboardSwitch
                  checked={form.custom_engines_enabled}
                  onCheckedChange={(custom_engines_enabled) =>
                    setForm((current) => ({ ...current, custom_engines_enabled }))
                  }
                  aria-label="Custom engines enabled"
                />
                <span className="text-sm font-medium text-slate-700">Custom engines enabled</span>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Max QPS</span>
                <Input
                  value={form.max_qps}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, max_qps: event.target.value }))
                  }
                  type="number"
                  min={1}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Allowed engines</span>
                <textarea
                  className={`${consoleTextareaClass} min-h-[90px] font-mono text-xs`}
                  value={form.allowedEnginesText}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      allowedEnginesText: event.target.value,
                    }))
                  }
                  placeholder={"sail\ngoogle\nbing\nworkflow\nexa"}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Features, one per line</span>
                <textarea
                  className={`${consoleTextareaClass} min-h-[140px]`}
                  value={form.featuresText}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, featuresText: event.target.value }))
                  }
                  placeholder={"Priority support\nHigher limits\nMonthly credit allocation"}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={savePlan} disabled={isSavingPlan}>
                {isSavingPlan ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {selectedPlanId ? "Update plan" : "Create plan"}
              </Button>
              {selectedPlanId ? (
                <Button
                  variant="destructive"
                  onClick={() => deletePlanMutation.mutate(selectedPlanId)}
                  disabled={deletePlanMutation.isPending}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete plan
                </Button>
              ) : null}
            </div>

            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            {settingsError ? <p className="text-sm text-red-600">{settingsError}</p> : null}
            {createPlanMutation.error ? (
              <p className="text-sm text-red-600">{(createPlanMutation.error as ApiError).message}</p>
            ) : null}
            {updatePlanMutation.error ? (
              <p className="text-sm text-red-600">{(updatePlanMutation.error as ApiError).message}</p>
            ) : null}
            {deletePlanMutation.error ? (
              <p className="text-sm text-red-600">{(deletePlanMutation.error as ApiError).message}</p>
            ) : null}
            {saveSettingMutation.error ? (
              <p className="text-sm text-red-600">{(saveSettingMutation.error as ApiError).message}</p>
            ) : null}
        </InspectorDrawer>
      </div>
    </ConsolePage>
  );
}
