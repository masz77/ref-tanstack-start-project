import { type SQL, sql } from 'drizzle-orm'

const WORKER_START_TIME = Date.now()

export function getIndexPayload() {
  return {
    message: 'Welcome to Tasks API',
    version: '1.0.0',
    // why: the Hono app is mounted under /api, so these links must carry that prefix.
    documentation: 'Visit /api/reference for API documentation',
    endpoints: {
      health: '/api/health',
      docs: '/api/doc',
      reference: '/api/reference',
    },
  }
}

export function getHealthPayload() {
  const uptime = Math.floor((Date.now() - WORKER_START_TIME) / 1000)

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime,
    version: '1.0.0',
  }
}

type SqlRunner = { run: (query: SQL) => Promise<unknown> }

// Resolves true when the DB answers `select 1`. Never throws: callers pick the failure shape.
// why: takes a thunk so a missing D1 binding (db() throws) is caught here too, as before.
export async function checkDatabase(getDatabase: () => SqlRunner): Promise<boolean> {
  try {
    await getDatabase().run(sql`select 1`)
    return true
  } catch {
    return false
  }
}
