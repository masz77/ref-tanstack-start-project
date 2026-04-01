import type { Env } from "@/infrastructure/db";
import type { CronJob, CronJobResult } from "./types";

/**
 * CronManager - Manages registration and execution of scheduled cron jobs
 *
 * Usage:
 * 1. Import and register jobs: CronManager.registerJob(myJob)
 * 2. Execute all jobs: await CronManager.executeAllJobs(env)
 * 3. Execute specific job: await CronManager.executeJob('job-name', env)
 */
export class CronManager {
  private static jobs: Map<string, CronJob> = new Map();

  /**
   * Register a cron job
   * @param job - The cron job to register
   * @throws Error if a job with the same name is already registered
   */
  static registerJob(job: CronJob): void {
    if (this.jobs.has(job.name)) {
      throw new Error(`Cron job "${job.name}" is already registered`);
    }

    this.jobs.set(job.name, job);
  }

  /**
   * Get all registered jobs
   * @returns Array of all registered cron jobs
   */
  static getAllJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get a specific job by name
   * @param name - The name of the job to retrieve
   * @returns The cron job or undefined if not found
   */
  static getJob(name: string): CronJob | undefined {
    return this.jobs.get(name);
  }

  /**
   * Execute a specific cron job by name
   * @param name - The name of the job to execute
   * @param env - Cloudflare environment bindings
   * @returns Result of the job execution
   */
  static async executeJob(name: string, env: Env): Promise<CronJobResult> {
    const job = this.jobs.get(name);

    if (!job) {
      return {
        jobName: name,
        success: false,
        duration: 0,
        error: `Job "${name}" not found`,
      };
    }

    if (!job.enabled) {
      return {
        jobName: name,
        success: false,
        duration: 0,
        error: `Job "${name}" is disabled`,
      };
    }

    const startTime = Date.now();

    try {
      await job.execute(env);
      const duration = Date.now() - startTime;

      return {
        jobName: name,
        success: true,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        jobName: name,
        success: false,
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute all enabled cron jobs
   * @param env - Cloudflare environment bindings
   * @returns Array of results for each job execution
   */
  static async executeAllJobs(env: Env): Promise<CronJobResult[]> {
    const results: CronJobResult[] = [];

    for (const job of this.jobs.values()) {
      if (job.enabled) {
        const result = await this.executeJob(job.name, env);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Handle Cloudflare Workers scheduled event
   * Executes all enabled cron jobs and logs results
   * @param env - Cloudflare environment bindings
   */
  static async handleScheduledEvent(env: Env): Promise<void> {
    console.log("Executing scheduled cron jobs...");

    const results = await this.executeAllJobs(env);

    for (const result of results) {
      if (result.success) {
        console.log(`✓ ${result.jobName} completed in ${result.duration}ms`);
      } else {
        console.error(`✗ ${result.jobName} failed: ${result.error}`);
      }
    }

    console.log(`Cron execution complete: ${results.length} jobs processed`);
  }
}

/**
 * Execute all registered cron jobs
 * This function is called by the Cloudflare Workers scheduled handler
 * @param env - Cloudflare environment bindings
 */
export async function executeCronJobs(env: Env): Promise<void> {
  await CronManager.handleScheduledEvent(env);
}

// Export the jobs array for reference
export const registeredJobs: CronJob[] = [];

// Register jobs here - import and add new jobs as they are created
// Example:
// import { cleanupOldLogs } from './jobs/cleanup-old-logs';
// CronManager.registerJob(cleanupOldLogs);
