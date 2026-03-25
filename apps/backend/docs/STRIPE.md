  Next Steps:

  1. Set environment variables in .env (copy from .env.example)
  2. Update Stripe price IDs in src/lib/stripe-plans.ts with actual Stripe product/price IDs
  3. Run database migration: bun run db:generate && bun run db:migrate

  API Endpoints Available:

  - GET /api/v1/subscriptions/plans - List all plans
  - GET /api/v1/subscriptions/current - Get user's subscription
  - POST /api/v1/subscriptions/checkout - Create checkout session
  - POST /api/v1/subscriptions/portal - Create customer portal session

  Better Auth handles Stripe webhooks automatically at /api/auth/stripe/webhook.