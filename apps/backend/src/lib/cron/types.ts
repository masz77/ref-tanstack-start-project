import type { Env } from "@/infrastructure/db";

/**
 * Cron job definition for Cloudflare Workers scheduled triggers
 */
export interface CronJob {
  /**
   * Unique name for the cron job (kebab-case)
   */
  name: string;

  /**
   * Cron expression defining when the job should run
   * Examples:
   * - "* /5 * * * *" - Every 5 minutes
   * - "0 * * * *" - Every hour at minute 0
   * - "0 0 * * *" - Daily at midnight
   * - "0 0 * * 0" - Weekly on Sunday at midnight
   * - "0 0 1 * *" - Monthly on the 1st at midnight
   */
  schedule: string;

  /**
   * Human-readable description of what this job does
   */
  description: string;

  /**
   * Whether this job is currently enabled
   */
  enabled: boolean;

  /**
   * The job execution function
   * @param env - Cloudflare environment bindings (DB, KV, etc.)
   */
  execute: (env: Env) => Promise<void>;
}

/**
 * Result of executing a cron job
 */
export interface CronJobResult {
  /**
   * Name of the job that was executed
   */
  jobName: string;

  /**
   * Whether the job executed successfully
   */
  success: boolean;

  /**
   * Execution duration in milliseconds
   */
  duration: number;

  /**
   * Error message if execution failed
   */
  error?: string;
}
