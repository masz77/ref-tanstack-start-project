import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import type { HealthResponse } from '@/lib/contracts'

export const Route = createFileRoute('/health-demo')({
  component: HealthDemoPage,
})

function HealthDemoPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const api = createApiClient()

    api.health
      .$get()
      .then(async (res) => {
        // Non-2xx → error state (never empty), per api-response-handling rule
        if (!res.ok) {
          throw new Error(`Backend returned ${res.status}`)
        }
        const { data } = await res.json()
        setHealth(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend')
        setLoading(false)
      })
  }, [])

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Backend Health</h1>
      {loading && <p className="text-muted-foreground">Checking backend...</p>}
      {error && (
        <div className="rounded-md border border-destructive p-4 text-destructive">
          <p className="font-medium">Connection failed</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-xs mt-2 text-muted-foreground">
            Is the backend running? Run: <code>bun run dev:be</code>
          </p>
        </div>
      )}
      {health && (
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-green-500" />
            <span className="font-medium capitalize">{health.status}</span>
          </div>
          <p className="text-sm text-muted-foreground">Version: {health.version}</p>
          <p className="text-sm text-muted-foreground">Uptime: {health.uptime}s</p>
          <p className="text-sm text-muted-foreground">
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
