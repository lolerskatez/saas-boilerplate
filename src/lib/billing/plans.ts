export type PlanId = "free" | "pro" | "business";
export type BillingInterval = "monthly" | "yearly";

export interface PlanLimits {
  members: number;
  projects: number;
  apiKeys: number;
  storageMb: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: { monthly: number; yearly: number };
  limits: PlanLimits;
  features: string[];
  highlighted?: boolean;
}

export const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "For individuals and side projects.",
    price: { monthly: 0, yearly: 0 },
    limits: { members: 3, projects: 3, apiKeys: 1, storageMb: 100 },
    features: ["Up to 3 members", "3 projects", "1 API key", "100 MB storage", "Community support"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For growing teams that need more.",
    price: { monthly: 29, yearly: 290 },
    limits: { members: 20, projects: 50, apiKeys: 10, storageMb: 10_240 },
    features: ["Up to 20 members", "50 projects", "10 API keys", "10 GB storage", "Audit log", "Email support"],
    highlighted: true,
  },
  business: {
    id: "business",
    name: "Business",
    description: "For organizations at scale.",
    price: { monthly: 99, yearly: 990 },
    limits: { members: UNLIMITED, projects: UNLIMITED, apiKeys: UNLIMITED, storageMb: 102_400 },
    features: [
      "Unlimited members",
      "Unlimited projects",
      "Unlimited API keys",
      "100 GB storage",
      "Priority support",
      "SSO-ready",
    ],
  },
};

export const PLAN_LIST = Object.values(PLANS);

export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"] as const;

export function resolvePlanId(subscription: { plan: string; status: string } | null | undefined): PlanId {
  if (!subscription) return "free";
  if (!(ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(subscription.status)) return "free";
  return subscription.plan in PLANS ? (subscription.plan as PlanId) : "free";
}

export function isWithinLimit(limit: number, currentUsage: number, increment = 1): boolean {
  return currentUsage + increment <= limit;
}

export function formatLimit(limit: number): string {
  return Number.isFinite(limit) ? limit.toLocaleString("en-US") : "Unlimited";
}
