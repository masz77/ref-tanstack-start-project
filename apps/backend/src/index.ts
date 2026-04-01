import type { Env } from "@/infrastructure/db";
import { handleQueue } from "@/infrastructure/queue/handler";
import type { QueueMessage } from "@/infrastructure/queue/types";
import type { ExecutionContext, MessageBatch } from "@cloudflare/workers-types";
import { buildApp } from "./app";

export type { AppType } from "./app";

const app = buildApp();

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<QueueMessage>, env: Env, _ctx: ExecutionContext): Promise<void> {
    await handleQueue(batch, env);
  },
};
