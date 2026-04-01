import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

import type { AuthInstance } from "@/auth";

type SessionResponse = Awaited<ReturnType<AuthInstance["api"]["getSession"]>>;

type NormalizedSessionResponse = NonNullable<SessionResponse>;

export type AuthenticatedUser = NonNullable<NormalizedSessionResponse["user"]>;
export type AuthenticatedSession = NonNullable<NormalizedSessionResponse["session"]>;

/**
 * Required authentication middleware backed by better-auth.
 */
export async function authMiddleware(c: Context, next: Next) {
  const auth = c.get("auth");

  if (!auth) {
    throw new HTTPException(500, { message: "Authentication is not initialized." });
  }

  const result = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  const session = result?.session;
  const user = result?.user;

  if (!session || !user) {
    throw new HTTPException(401, { message: "Authentication required" });
  }

  c.set("session", session);
  c.set("user", user);

  await next();
}

/**
 * Optional authentication middleware - doesn't throw if no token provided
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const auth = c.get("auth");

  if (auth) {
    try {
      const result = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (result?.session && result?.user) {
        c.set("session", result.session);
        c.set("user", result.user);
      }
    } catch (error) {}
  }

  await next();
}

/**
 * Email verification middleware - ensures user has verified their email
 */
export async function requireEmailVerified(c: Context, next: Next) {
  const user = c.get("user") as AuthenticatedUser | undefined;

  if (!user) {
    throw new HTTPException(401, { message: "Authentication required" });
  }

  if (!isEmailVerified(user)) {
    throw new HTTPException(403, { message: "Email verification required" });
  }

  await next();
}

/**
 * Helper to get current user from context
 */
export function getCurrentUser(c: Context): AuthenticatedUser {
  const user = c.get("user") as AuthenticatedUser | undefined;
  if (!user) {
    throw new HTTPException(401, { message: "Authentication required" });
  }
  return user;
}

/**
 * Check if user has verified email
 */
export function isEmailVerified(user: AuthenticatedUser): boolean {
  return Boolean((user as any)?.emailVerified);
}

// Default export for convenience
export default authMiddleware;
