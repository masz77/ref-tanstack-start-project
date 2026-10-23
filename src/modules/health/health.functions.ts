import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import db from '@/server/infrastructure/db'
import { checkDatabase, getHealthPayload, getIndexPayload } from './health.server'

export const getIndex = createServerFn({ method: 'GET' }).handler(() => getIndexPayload())

export const getHealth = createServerFn({ method: 'GET' }).handler(() => getHealthPayload())

// why: throws on failure so the UI shows its error state; a `false` result would read as empty.
export const getDatabaseCheck = createServerFn({ method: 'GET' }).handler(async () => {
  if (!(await checkDatabase(() => db(env)))) {
    throw new Error('Database unreachable')
  }

  return { message: 'Database reachable' }
})
