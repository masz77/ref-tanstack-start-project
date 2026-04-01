/**
 * Check if the application is running in production environment
 */
export function isProductionEnvironment() {
  if (typeof process !== "undefined" && process.env?.NODE_ENV) {
    return process.env.NODE_ENV === "production";
  }

  if (typeof globalThis !== "undefined" && (globalThis as any)?.NODE_ENV) {
    return (globalThis as any).NODE_ENV === "production";
  }

  return false;
}

/**
 * Get secure cookie options for refresh tokens
 */
export function getRefreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: isProductionEnvironment(), // Only secure in production
    sameSite: "Lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  };
}

/**
 * Cookie names used in the application
 */
export const COOKIE_NAMES = {
  REFRESH_TOKEN: "refresh_token",
} as const;
