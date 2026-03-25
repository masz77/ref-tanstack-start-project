# Core Library Utilities

This directory contains essential utilities and configurations for the Hono OpenAPI application.

## Overview

The lib folder provides core functionality for:
- **App Creation** - Router and app factory functions
- **Authentication** - Supabase authentication utilities
- **Type Definitions** - TypeScript types for the application
- **API Logging** - Request/response logging utilities
- **Cookie Management** - Secure cookie utilities for auth tokens
- **OpenAPI Configuration** - API documentation setup

## Key Files

### Core App Setup
- `create-app.ts` - Main app factory with middleware setup
- `types.ts` - TypeScript type definitions for the application
- `configure-open-api.ts` - OpenAPI documentation configuration

### Authentication
- `supabase.ts` - Supabase authentication service and utilities
- `cookie-utils.ts` - Secure cookie management for auth tokens

### Logging
- `api-logger.ts` - API request/response logging utilities

## Usage Examples

### Creating Routes

```typescript
import { createRouter } from "@/lib/create-app";

const router = createRouter()
  .openapi(route1, handler1)
  .openapi(route2, handler2);

export default router;
```

### Authentication in Controllers

```typescript
import type { AppRouteHandler } from "@/lib/types";
import { getRefreshTokenCookieOptions, COOKIE_NAMES } from "@/lib/cookie-utils";

export const handler: AppRouteHandler<typeof route> = async (c) => {
  // Your handler logic here
  const cookieOptions = getRefreshTokenCookieOptions();
  // ...
};
```

### Supabase Authentication

```typescript
import { SupabaseAuth, supabase } from "@/lib/supabase";

// Sign up a new user
const userData = await SupabaseAuth.signUp(email, password);

// Sign in existing user
const session = await SupabaseAuth.signIn(email, password);

// Get current user
const user = await SupabaseAuth.getCurrentUser();
```

### API Logging

```typescript
import { ApiLogger } from "@/lib/api-logger";

// Log API request/response
await ApiLogger.log({
  path: '/api/endpoint',
  method: 'POST',
  statusCode: 200,
  responseTime: 150,
  // ... other log data
});
```

## App Configuration

The main app is configured in `create-app.ts` with:
- Request ID middleware
- Favicon serving
- Pino logging
- API request logging
- Error handling

## Type Safety

All routes use the `AppRouteHandler` type for full type safety:

```typescript
import type { AppRouteHandler } from "@/lib/types";

export const handler: AppRouteHandler<typeof route> = async (c) => {
  // Full type safety for context, validated data, etc.
};
```

## Benefits

1. **Simplified Structure** - Only essential utilities remain
2. **Type Safety** - Full TypeScript support throughout
3. **Centralized Auth** - Supabase authentication utilities
4. **Consistent Logging** - Standardized API logging
5. **Secure Cookies** - Proper cookie management for auth
6. **Clean Architecture** - Separation of concerns with focused utilities 