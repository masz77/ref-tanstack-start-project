# Authentication and Validation Middleware

This directory contains comprehensive authentication, authorization, and validation middleware for the API.

## Authentication Middleware (`auth.ts`)

### Core Features

- **Better Auth Integration**: Validates Better Auth sessions
- **User Context Loading**: Automatically loads authenticated user information
- **Email Verification**: Provides email verification requirements
- **Session Management**: Handles session context in requests

### Usage Examples

#### Basic Authentication

```typescript
import { authMiddleware } from '@/middlewares/auth';

// Require authentication for all routes
app.use('*', authMiddleware);

// Or for specific routes
app.use('/api/protected/*', authMiddleware);
```

#### Optional Authentication

```typescript
import { optionalAuthMiddleware } from '@/middlewares/auth';

// Optional authentication - doesn't throw if no session
app.use('/api/public/*', optionalAuthMiddleware);
```

#### Email Verification Requirement

```typescript
import { requireEmailVerified } from '@/middlewares/auth';

// Require verified email after authentication
app.use('/api/verified/*', authMiddleware, requireEmailVerified);
```

### Helper Functions

```typescript
import { 
  getCurrentUser, 
  isEmailVerified 
} from '@/middlewares/auth';

// In route handlers
export const handler = async (c) => {
  const user = getCurrentUser(c);
  
  // Check email verification
  if (isEmailVerified(user)) {
    // Verified user logic
  }
  
  // Access user properties
  console.log(user.id, user.email, user.name);
};
```

## Validation Middleware (`validation.ts`)

### Request Validation

```typescript
import { validateBody, validateQuery, validateParams } from '@/middlewares/validation';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

// Validate request body
app.post('/users', validateBody(createUserSchema), handler);

// Validate query parameters
const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
});

app.get('/search', validateQuery(searchSchema), handler);
```

### Common Validation Schemas

```typescript
import { commonSchemas } from '@/middlewares/validation';

// Use pre-built schemas
app.get('/users', validateQuery(commonSchemas.pagination), handler);
app.get('/reports', validateQuery(commonSchemas.dateRange), handler);
```

### File Upload Validation

```typescript
import { validateFileUpload } from '@/middlewares/validation';

app.post('/upload', 
  validateFileUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png'],
    required: true
  }), 
  handler
);
```

### Rate Limiting

```typescript
import { validateRateLimit } from '@/middlewares/validation';

// 100 requests per 15 minutes
app.use('/api/*', validateRateLimit(100, 15 * 60 * 1000));
```

### Workspace Access Validation

```typescript
import { validateWorkspaceAccess } from '@/middlewares/validation';

// Ensure user can access specific workspace
app.use('/api/workspaces/:workspaceId/*', validateWorkspaceAccess());
```

## Error Handling (`error-handler.ts`)

### Global Error Handler

```typescript
import { errorHandler, notFoundHandler } from '@/middlewares/error-handler';

// Apply global error handling
app.use('*', errorHandler);

// Handle 404s
app.notFound(notFoundHandler);
```

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users"
}
```

## API Logging (`api-logger.ts`)

### Request/Response Logging

```typescript
import { apiLoggingMiddleware } from '@/middlewares/api-logger';

// Log all API requests and responses
app.use('*', apiLoggingMiddleware());
```

## Pino Logger (`pino-logger.ts`)

### Structured Logging

```typescript
import { pinoLogger } from '@/middlewares/pino-logger';

// Add structured logging middleware
app.use('*', pinoLogger());
```

## Complete Route Example

```typescript
import { createRouter } from '@/lib/create-app';
import { 
  authMiddleware, 
  optionalAuthMiddleware,
  requireEmailVerified,
  getCurrentUser
} from '@/middlewares/auth';
import { validateBody, validateQuery } from '@/middlewares/validation';
import { errorHandler } from '@/middlewares/error-handler';
import { apiLoggingMiddleware } from '@/middlewares/api-logger';

const router = createRouter()
  // Apply global middleware
  .use('*', errorHandler)
  .use('*', apiLoggingMiddleware())
  
  // Public route with optional auth
  .get('/public', 
    optionalAuthMiddleware,
    async (c) => {
      const user = c.get('user'); // May be undefined
      // Implementation
    }
  )
  
  // Protected route requiring authentication
  .get('/protected',
    authMiddleware,
    async (c) => {
      const user = getCurrentUser(c);
      // Implementation
    }
  )
  
  // Route requiring verified email
  .post('/verified-only',
    authMiddleware,
    requireEmailVerified,
    validateBody(createSchema),
    async (c) => {
      const user = getCurrentUser(c);
      const body = c.get('validatedBody');
      // Implementation
    }
  );
```

## Testing

The middleware includes comprehensive tests. Run them with:

```bash
npm test -- --run src/middlewares/__tests__/
```

## Security Considerations

1. **Session Validation**: All sessions are validated through Better Auth
2. **Email Verification**: Email verification can be enforced for sensitive operations
3. **CORS Handling**: OPTIONS requests are properly handled for CORS preflight
4. **Rate Limiting**: Prevents abuse and DoS attacks
5. **Input Validation**: All inputs are validated before processing
6. **Error Handling**: Sensitive information is not leaked in error messages