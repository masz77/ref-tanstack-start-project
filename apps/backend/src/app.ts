import authRouter from "@/features/auth/routes";
import index from "@/features/health/routes";
import { logsRouter } from "@/features/logs/routes";
import sessionRouter from "@/features/session/routes";
import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";

export function buildApp() {
  const app = createApp();

  configureOpenAPI(app);

  const routes = app
    .route("/", authRouter)
    .route("/", sessionRouter)
    .route("/", index)
    .route("/", logsRouter);

  return routes;
}

export type AppType = ReturnType<typeof buildApp>;

export default buildApp;
