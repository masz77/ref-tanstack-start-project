import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/lib/create-app";
import { optionalAuthMiddleware } from "@/middleware/auth";
import { httpErrorResponseSchema } from "@/shared/schemas";
import type { AppRouteHandler } from "@/shared/types";

// 2026-05-29: Typed `/api/session` response. The user shape mirrors what
// `auth.api.getSession()` returns under better-auth's defaults — base user
// fields serialized over JSON (`createdAt`/`updatedAt` are ISO strings, not
// Date). When you add `customSession`/`additionalFields`, extend this schema
// to match so Hono RPC inference surfaces the new fields on the FE.
const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isAnonymous: z.boolean().nullable().optional(),
});

const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const sessionResponseSchema = z
  .object({
    data: z.union([
      z.object({
        user: sessionUserSchema,
        session: sessionSchema,
      }),
      z.null(),
    ]),
  })
  .openapi("SessionResponse");

const getSessionRoute = createRoute({
  method: "get",
  path: "/api/session",
  tags: ["session"],
  responses: {
    200: {
      content: { "application/json": { schema: sessionResponseSchema } },
      description: "Current session or null when unauthenticated",
    },
    500: {
      content: { "application/json": { schema: httpErrorResponseSchema } },
      description: "Server error",
    },
  },
});

const router = createRouter();
// optionalAuthMiddleware swallows 401 — we want to return `{ data: null }` on
// no-session, not throw. Keeps the FE query path clean (no special-casing 401).
router.use("/api/session", optionalAuthMiddleware);

// Thin pass-through over `auth.api.getSession()`. If you later add the
// `customSession` plugin, this route automatically picks up the enriched user
// — no changes needed here.
export const sessionRouter = router.openapi(getSessionRoute, (async (c) => {
  const auth = c.get("auth");
  if (!auth) return c.json({ data: null }, 200);
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result?.user || !result?.session) return c.json({ data: null }, 200);

  return c.json({ data: { user: result.user, session: result.session } }, 200);
}) as AppRouteHandler<typeof getSessionRoute>);

export default sessionRouter;
