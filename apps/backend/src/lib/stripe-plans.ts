export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  currency: string;
  interval: "month" | "year";
  features: string[];
  stripePriceId: string;
  stripeProductId: string;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    currency: "usd",
    interval: "month",
    features: [
      "Basic features",
      "Up to 100 API requests/month",
      "Community support"
    ],
    stripePriceId: "", // No Stripe price for free plan
    stripeProductId: ""
  },
  
  starter: {
    id: "starter",
    name: "Starter",
    description: "Great for small projects",
    price: 999, // $9.99
    currency: "usd",
    interval: "month",
    features: [
      "All Free features",
      "Up to 10,000 API requests/month",
      "Email support",
      "Priority processing"
    ],
    stripePriceId: "price_starter_monthly", // Replace with actual Stripe price ID
    stripeProductId: "prod_starter" // Replace with actual Stripe product ID
  },

  pro: {
    id: "pro",
    name: "Pro",
    description: "Perfect for growing businesses",
    price: 2999, // $29.99
    currency: "usd",
    interval: "month",
    features: [
      "All Starter features",
      "Up to 100,000 API requests/month",
      "Priority support",
      "Advanced analytics",
      "Custom integrations"
    ],
    stripePriceId: "price_pro_monthly", // Replace with actual Stripe price ID
    stripeProductId: "prod_pro" // Replace with actual Stripe product ID
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large-scale operations",
    price: 9999, // $99.99
    currency: "usd",
    interval: "month",
    features: [
      "All Pro features",
      "Unlimited API requests",
      "24/7 phone support",
      "Custom SLA",
      "Dedicated account manager",
      "On-premise deployment options"
    ],
    stripePriceId: "price_enterprise_monthly", // Replace with actual Stripe price ID
    stripeProductId: "prod_enterprise" // Replace with actual Stripe product ID
  }
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

export function getPlan(planId: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[planId as PlanId] || null;
}

export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

export function getPaidPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS).filter(plan => plan.price > 0);
}