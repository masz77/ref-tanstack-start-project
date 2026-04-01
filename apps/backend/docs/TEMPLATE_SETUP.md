# Template Setup Guide

Welcome! You've successfully created a new project from the Hono OpenAPI Starter Template. Follow these steps to get your API up and running on Cloudflare Workers.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up Environment Variables

```bash
# Create local development environment file
# Edit .dev.vars with your actual configuration
```

Create a `.dev.vars` file in the root directory with the following:

```env
# Better Auth
BETTER_AUTH_SECRET="your-32-character-secret-key-here"
BETTER_AUTH_URL="http://localhost:8787"

# Stripe (for payment integration)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional: OpenAI
OPENAI_API_KEY="your-openai-api-key"
```

### 3. Configure Cloudflare Bindings

Update `wrangler.toml` with your project name and configure bindings:

```toml
name = "your-project-name"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "your-db-name"
database_id = "your-db-id"

# KV Namespace for sessions/cache
[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"

# Durable Objects for rate limiting
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"
```

### 4. Set Up Cloudflare D1 Database

```bash
# Create D1 database
wrangler d1 create your-db-name

# This will output database_name and database_id
# Copy these values to your wrangler.toml

# Create KV namespace
wrangler kv:namespace create "KV"

# Copy the KV namespace id to your wrangler.toml
```

### 5. Run Database Migrations

```bash
# Generate migrations from schema
bun run db:generate

# Apply migrations to D1 (local development)
wrangler d1 migrations apply your-db-name --local

# Apply migrations to D1 (production)
wrangler d1 migrations apply your-db-name
```

### 6. Start Development Server

```bash
bun run dev
```

Your API will be available at:
- **API**: http://localhost:8787
- **Documentation**: http://localhost:8787/doc
- **API Reference**: http://localhost:8787/reference

## 🔧 Customization

### Update Package Information
1. Edit `package.json` to update:
   - `name`: Your project name
   - `description`: Your project description
   - `version`: Your starting version
   - `repository`: Your repository URL (if applicable)

2. Edit `wrangler.toml` to update:
   - `name`: Your Cloudflare Worker name
   - `compatibility_date`: Latest compatibility date

### Customize the API
1. **Routes**: Check `src/routes/` for example routes
2. **Database Schema**: Edit `src/db/schema.ts` to define your tables
3. **Environment**: Add new environment variables in `src/env.ts`
4. **Authentication**: Configure Better Auth in `src/lib/auth.ts`
5. **API Documentation**: Update OpenAPI metadata in `src/lib/configure-open-api.ts`

### Remove Template Files (Optional)
Once you're set up, you can delete:
- `docs/TEMPLATE_SETUP.md` (this file)
- Modify `README.md` to describe your specific project

## 📚 Next Steps

1. **Authentication**: The template includes Better Auth with email/password, passkeys, 2FA, and organization support
2. **Database Schema**: Define your tables in `src/db/schema.ts` using Drizzle ORM
3. **API Routes**: Add your business logic in `src/routes/v1/`
4. **Testing**: Write tests using the examples in `*.test.ts` files
5. **Deployment**: Deploy to Cloudflare Workers with `wrangler deploy`

### Production Deployment

#### Understanding Cloudflare Workers Deployment

Cloudflare Workers run your code on Cloudflare's global edge network, providing:
- **Global distribution**: Your API runs in 300+ cities worldwide
- **Zero cold starts**: Workers start in under 1ms
- **Automatic scaling**: Handle any traffic volume without configuration
- **Edge compute**: Process requests close to your users

#### Secrets Management

This template uses **two different approaches** for managing secrets:

**Local Development** (`.dev.vars` file):
```env
# .dev.vars - Used by `wrangler dev` for local development
# This file should be in .gitignore and never committed
BETTER_AUTH_SECRET="your-32-character-secret-key-here"
BETTER_AUTH_URL="http://localhost:8787"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

**Production** (Cloudflare Secrets):
```bash
# Set secrets in Cloudflare Workers via wrangler CLI
# These are encrypted and only accessible at runtime
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put BETTER_AUTH_URL  # e.g., https://your-worker.workers.dev
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Optional: Set OpenAI API key if needed
wrangler secret put OPENAI_API_KEY
```

**Important**: Never hardcode secrets in `wrangler.toml` or commit them to version control.

#### Deployment Workflow

1. **Ensure all migrations are applied**:
   ```bash
   # Apply migrations to production D1 database
   wrangler d1 migrations apply your-db-name
   ```

2. **Deploy your worker**:
   ```bash
   # Deploy to Cloudflare Workers
   wrangler deploy

   # This will:
   # - Build your application
   # - Upload to Cloudflare's network
   # - Deploy across 300+ edge locations
   # - Provide a *.workers.dev URL
   ```

3. **Set production secrets** (first-time setup):
   ```bash
   wrangler secret put BETTER_AUTH_SECRET
   wrangler secret put BETTER_AUTH_URL
   wrangler secret put STRIPE_SECRET_KEY
   wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

4. **Verify deployment**:
   ```bash
   # Check worker status
   wrangler deployments list

   # View recent logs
   wrangler tail
   ```

#### Managing Cloudflare Bindings

Your `wrangler.toml` defines bindings that connect your worker to Cloudflare services:

```toml
# D1 Database - Serverless SQL at the edge
[[d1_databases]]
binding = "DB"                    # Access via env.DB in your code
database_name = "your-db-name"    # Database name
database_id = "your-db-id"        # Unique database identifier

# KV Namespace - Key-value storage for caching/sessions
[[kv_namespaces]]
binding = "KV"                    # Access via env.KV in your code
id = "your-kv-id"                 # KV namespace identifier

# Durable Objects - Stateful coordination (rate limiting)
[[durable_objects.bindings]]
name = "RATE_LIMITER"             # Access via env.RATE_LIMITER
class_name = "RateLimiter"        # Class exported from your code
```

**Creating Bindings**:
```bash
# Create production D1 database
wrangler d1 create your-production-db

# Create production KV namespace
wrangler kv:namespace create "KV"

# Update wrangler.toml with the IDs from these commands
```

#### Post-Deployment

After deploying, you can:

```bash
# View real-time logs
wrangler tail

# List all deployments
wrangler deployments list

# View worker details
wrangler deployments view

# Monitor in Cloudflare Dashboard
# Visit: https://dash.cloudflare.com/ → Workers & Pages
```

#### Environment-Specific Configurations

For staging/production environments:

1. Create separate D1 databases and KV namespaces
2. Use `wrangler.toml` environments:
   ```toml
   [env.staging]
   name = "your-project-staging"
   [[env.staging.d1_databases]]
   binding = "DB"
   database_name = "your-db-staging"
   database_id = "staging-db-id"
   ```
3. Deploy to specific environment:
   ```bash
   wrangler deploy --env staging
   ```

## 🆘 Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review [CLAUDE.md](./CLAUDE.md) for development patterns and architecture
- Visit the [Hono documentation](https://hono.dev/)
- Check [Drizzle ORM docs](https://orm.drizzle.team/) for database operations
- Read [Cloudflare D1 docs](https://developers.cloudflare.com/d1/) for database management
- Explore [Better Auth docs](https://www.better-auth.com/) for authentication

Happy coding! 🎉
