import { apiBaseUrl } from "@/lib/api-base-url";
import type { BillingPlan, JsonValue } from "@/lib/types";

export type PricingPlanMetadata = {
  billing_type: "payment" | "subscription";
  interval: "" | "day" | "week" | "month" | "year";
  badge: string;
  cta_label: string;
  cost_per_credit: string;
  value_increase: string;
  plan_family: string;
  featured: boolean;
  builtin: boolean;
  included_searches: number;
  signup_bonus_credits: number;
  monthly_free_credits: number;
  cost_per_1k_basic: string;
  package_kind: string;
  custom_engines_enabled: boolean;
  allowed_engines: string[];
  max_qps: number;
  features: string[];
};

export function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function normalizePlanMetadata(
  metadata: Record<string, JsonValue> | undefined
): PricingPlanMetadata {
  const billingType = metadata?.billing_type === "subscription" ? "subscription" : "payment";
  const intervalValue = typeof metadata?.interval === "string" ? metadata.interval.toLowerCase() : "";
  const interval =
    intervalValue === "day" ||
    intervalValue === "week" ||
    intervalValue === "month" ||
    intervalValue === "year"
      ? intervalValue
      : "";
  const rawFeatures = metadata?.features;
  const features = Array.isArray(rawFeatures)
    ? rawFeatures
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

  return {
    billing_type: billingType,
    interval,
    badge: typeof metadata?.badge === "string" ? metadata.badge : "",
    cta_label: typeof metadata?.cta_label === "string" ? metadata.cta_label : "",
    cost_per_credit:
      typeof metadata?.cost_per_credit === "string" ? metadata.cost_per_credit : "",
    value_increase:
      typeof metadata?.value_increase === "string" ? metadata.value_increase : "",
    plan_family: typeof metadata?.plan_family === "string" ? metadata.plan_family : "",
    featured: metadata?.featured === true,
    builtin: metadata?.builtin === true,
    included_searches:
      typeof metadata?.included_searches === "number" ? metadata.included_searches : 0,
    signup_bonus_credits:
      typeof metadata?.signup_bonus_credits === "number" ? metadata.signup_bonus_credits : 0,
    monthly_free_credits:
      typeof metadata?.monthly_free_credits === "number" ? metadata.monthly_free_credits : 0,
    cost_per_1k_basic:
      typeof metadata?.cost_per_1k_basic === "string" ? metadata.cost_per_1k_basic : "",
    package_kind: typeof metadata?.package_kind === "string" ? metadata.package_kind : "",
    custom_engines_enabled: metadata?.custom_engines_enabled === true,
    allowed_engines: Array.isArray(metadata?.allowed_engines)
      ? metadata.allowed_engines
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [],
    max_qps: typeof metadata?.max_qps === "number" ? metadata.max_qps : 1,
    features,
  };
}

const paidEngines = ["sail", "google", "bing", "brave", "duckduckgo", "workflow", "exa", "tavily", "brave_api"];
const paidFeatures = [
  "Sail Engine by default",
  "Advanced routing controls",
  "AI-ready Markdown, dedupe, and compression",
];

export const fallbackPublicPricingPlans: BillingPlan[] = [
  {
    id: -1,
    code: "free",
    name: "Free",
    description: "3,000 launch credits for first-time signup, then 500 monthly credits.",
    credits: 3000,
    unit_amount_cents: 0,
    currency: "usd",
    stripe_price_id: null,
    stripe_product_id: null,
    is_active: true,
    metadata: {
      billing_type: "subscription",
      interval: "month",
      builtin: true,
      badge: "Launch credits",
      cta_label: "Start free",
      included_searches: 3000,
      signup_bonus_credits: 2500,
      monthly_free_credits: 500,
      custom_engines_enabled: false,
      allowed_engines: ["sail"],
      features: [
        "2,500 one-time signup bonus credits",
        "500 free credits every month",
        "Sail Engine only",
      ],
    },
  },
  ...[
    ["starter-monthly", "Starter", 7000, 2900, "$4.14", false, "Start Starter", 5],
    ["pro-monthly", "Pro", 22000, 7900, "$3.59", true, "Start Pro", 20],
    ["scale-monthly", "Scale", 85000, 24900, "$2.93", false, "Start Scale", 50],
  ].map(([code, name, credits, amount, costPer1k, featured, cta, maxQps], index) => ({
    id: -10 - index,
    code: String(code),
    name: String(name),
    description:
      name === "Starter"
        ? "Production-ready Operations Platform for AI usage with configurable Sail routing."
        : name === "Pro"
          ? "Most popular plan for teams running academic operations and review workflows."
          : "Higher-volume AI search with larger monthly included credit packages.",
    credits: Number(credits),
    unit_amount_cents: Number(amount),
    currency: "usd",
    stripe_price_id: null,
    stripe_product_id: null,
    is_active: true,
    metadata: {
      billing_type: "subscription",
      interval: "month",
      featured: Boolean(featured),
      badge: featured ? "Most popular" : "",
      cta_label: String(cta),
      cost_per_1k_basic: String(costPer1k),
      custom_engines_enabled: true,
      allowed_engines: paidEngines,
      max_qps: Number(maxQps),
      features: [`${Number(credits).toLocaleString()} credits reset every month`, ...paidFeatures],
    },
  })),
  ...[
    ["topup-25", "$25 Top-up", "A small pack for occasional extra usage.", 5000, 2500, ""],
    ["topup-100", "$100 Top-up", "Extra credits with a modest volume bonus.", 22000, 10000, "Bonus credits"],
    ["topup-500", "$500 Top-up", "Larger credit package for bursty workloads.", 125000, 50000, "Best top-up value"],
  ].map(([code, name, description, credits, amount, badge], index) => ({
    id: -20 - index,
    code: String(code),
    name: String(name),
    description: String(description),
    credits: Number(credits),
    unit_amount_cents: Number(amount),
    currency: "usd",
    stripe_price_id: null,
    stripe_product_id: null,
    is_active: true,
    metadata: {
      billing_type: "payment",
      package_kind: "topup",
      badge: String(badge),
      cta_label: "Buy credits",
      custom_engines_enabled: false,
      allowed_engines: ["sail"],
      features: [`${Number(credits).toLocaleString()} credits added to your balance`],
    },
  })),
];

export async function getPublicPricingPlans(): Promise<BillingPlan[]> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/v1/pricing/plans`, {
      next: {
        revalidate: 3600,
        tags: ["public-pricing-plans"],
      },
    });
    if (!response.ok) {
      return fallbackPublicPricingPlans;
    }
    const plans = (await response.json()) as BillingPlan[];
    return plans.length > 0 ? plans : fallbackPublicPricingPlans;
  } catch {
    return fallbackPublicPricingPlans;
  }
}
