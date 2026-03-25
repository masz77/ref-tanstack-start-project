# Hono OpenAPI Starter Template (Cloudflare Workers)

A production-ready **white-label template** for building REST APIs with Hono.js, OpenAPI documentation, and modern TypeScript development tools optimized for Cloudflare Workers.

## White-Label Template

This is a white-label starter template designed to be cloned and customized for your specific project. It comes pre-configured with:
- Authentication system (email/password, passkeys, 2FA)
- Payment integration (Stripe subscriptions)
- Multi-tenant support (organizations plugin)
- API documentation and type generation
- Database migrations and ORM (Cloudflare D1)
- Caching and rate limiting (Cloudflare KV/Durable Objects)

**When starting a new project:**
1. Clone this template
2. Update project name in `package.json` and `wrangler.toml`
3. Customize branding and business logic
4. Configure Cloudflare bindings and environment variables
5. Adapt the database schema to your needs

## 🚀 Features

- **[Hono.js](https://hono.dev/)** - Ultrafast web framework optimized for edge
- **Cloudflare Workers** - Deploy globally on Cloudflare's edge network
- **OpenAPI 3.1** - Auto-generated API documentation with [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe database operations
- **[Better Auth](https://www.better-auth.com/)** - Modern authentication with session management
  - Email/password, passkeys, 2FA support
  - Anonymous users and admin roles
  - Organization plugin for multi-tenant architecture
- **[Stripe](https://stripe.com/)** - Payment processing and subscription management
- **Cloudflare D1** - Serverless SQL database at the edge
- **Cloudflare KV** - Key-value storage for caching and sessions
- **Rate Limiting** - Built-in rate limiting with Cloudflare Durable Objects
- **TypeScript** - Full type safety throughout the stack
- **Zod** - Runtime type validation and OpenAPI schema generation
- **Vitest** - Modern testing framework
- **ESLint** - Code quality with @antfu/eslint-config
- **Hot Reload** - Fast development with Wrangler

## 📋 Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) - Cloudflare Workers CLI
- Cloudflare account (for deployment)

## 🛠️ Getting Started

### 1. Use This Template

Click the "Use this template" button above, or:

```bash
# Clone the repository
git clone <your-repo-url>
cd <your-project-name>

# Install dependencies
bun install

# Update project name and details
# Edit package.json and wrangler.toml - update the "name" field to your project name
# Customize other metadata as needed
```

### 2. Environment Setup

Configure your environment in `.dev.vars` for local development and Cloudflare secrets for production:

**`.dev.vars` (local development):**
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

**`wrangler.toml` (configure bindings):**
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

### 3. Cloudflare Setup

```bash
# Create D1 database
wrangler d1 create your-db-name

# Create KV namespace
wrangler kv:namespace create "KV"

# Generate database migrations
bun run db:generate

# Apply migrations to D1
wrangler d1 migrations apply your-db-name
```

### 4. Start Development

```bash
# Start the development server with Wrangler
bun run dev

# The API will be available at http://localhost:8787
# OpenAPI documentation at http://localhost:8787/doc
```

### 5. Deploy to Cloudflare Workers

```bash
# Deploy to production
wrangler deploy

# Set production secrets
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

## 📚 Project Structure

```
src/
├── app.ts                 # Main application setup and route registration
├── index.ts              # Server entry point with Hono node server
├── env.ts                # Environment validation with Zod schemas
├── db/
│   ├── index.ts          # Database connection and client setup
│   ├── schema.ts         # Drizzle schema definitions with indexes
│   └── migrations/       # Generated database migrations
├── lib/                   # Core utilities and configurations
│   ├── create-app.ts     # Hono app factory with middleware setup
│   ├── configure-open-api.ts  # OpenAPI documentation configuration
│   ├── auth.ts           # Better Auth configuration
│   ├── types.ts          # Shared TypeScript type definitions
│   ├── supabase.ts       # Supabase authentication utilities (legacy)
│   ├── cookie-utils.ts   # Secure cookie management for auth tokens
│   └── api-logger.ts     # API request/response logging utilities
├── middlewares/           # Authentication, validation, and logging middleware
│   ├── auth.ts           # Better Auth middleware (required/optional)
│   ├── api-logger.ts     # Request/response logging middleware
│   ├── pino-logger.ts    # Structured logging setup
│   ├── error-handler.ts  # Global error handling
│   └── validation.ts     # Request validation middleware
├── routes/
│   ├── index.route.ts    # Root routes (health check, API info)
│   └── v1/               # Versioned API routes
│       └── logs/         # API logging routes
└── types/
    └── api.ts            # Generated OpenAPI TypeScript types
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun run test --watch

# Run specific test file
bun run test src/lib/cache.test.ts
```

## 🗃️ Cache & Storage

This template uses **Cloudflare KV** for caching and session storage at the edge.

### KV Usage

Access KV storage through the environment bindings:

```typescript
// In route handlers
export default {
  async fetch(request: Request, env: Env) {
    // Set a value with optional TTL (in seconds)
    await env.KV.put("my-key", "my-value", { expirationTtl: 3600 });

    // Get a value
    const value = await env.KV.get("my-key");

    // Delete a value
    await env.KV.delete("my-key");
  }
}
```

### Rate Limiting with Durable Objects

Built-in rate limiting using Cloudflare Durable Objects for consistent, global rate limiting across all edge locations.

## 📖 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:8787/doc`
- **Scalar Reference**: `http://localhost:8787/reference`
- **OpenAPI JSON**: `http://localhost:8787/doc/openapi.json`

### Available Endpoints

- `GET /` - API information and available endpoints
- `GET /health` - Health check with uptime and version info
- `GET /api/session` - Current user session (requires authentication)

## 🏗️ Architecture Features

### Authentication & Authorization
- **Better Auth** integration with session-based authentication
- Optional and required authentication middleware
- Email verification support
- Secure cookie management for auth tokens

### Request/Response Handling
- **Type-safe routes** with OpenAPI schema validation
- **Structured logging** with Pino for all API requests
- **Global error handling** with consistent error response format
- **Request validation** using Zod schemas

### Database Integration
- **Drizzle ORM** with full TypeScript support
- **Cloudflare D1** - Serverless SQLite at the edge
- **Migration system** for schema management
- **Edge-optimized** queries with low latency

### Development Experience
- **Hot reload** development server
- **Auto-generated API documentation** from code
- **Type safety** throughout the entire stack
- **ESLint** with modern configuration

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run test` | Run tests |
| `bun run db:generate` | Generate database migrations |
| `bun run db:migrate` | Run database migrations |
| `bun run db:push` | Push schema to database |
| `bun run db:pull` | Pull schema from database |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run lint` | Run ESLint |
| `bun run lint:fix` | Fix ESLint issues |
| `bun run api:generate-types` | Generate TypeScript types from OpenAPI spec |
| `bun run lint:fix` | Fix ESLint issues |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Hono.js](https://hono.dev/) - The amazing ultrafast web framework
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database toolkit
- [Better Auth](https://www.better-auth.com/) - Modern authentication solution
- [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager
- [Zod](https://zod.dev/) - TypeScript-first schema validation
