import { createRouter } from "@/lib/create-app";

const router = createRouter();

router.all("/api/auth/*", async (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

export default router;
