import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import authRouter from "@/routes/auth.route";
import index from "@/routes/index.route";
import { logsRouter } from "@/routes/v1/logs/logs.routes";

export function buildApp() {
  const app = createApp();

  configureOpenAPI(app);

  // Chain routes — required for AppType RPC type inference.
  // forEach or app.route() in a loop loses route-level types.
  const routes = app
    .route("/", authRouter)
    .route("/", index)
    .route("/", logsRouter);
  // Add new routers here: .route("/", yourNewRouter)

  return routes;
}

export type AppType = ReturnType<typeof buildApp>;

export default buildApp;
