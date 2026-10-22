import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { healthQueryOptions } from '@/lib/template/queries'

export const Route = createFileRoute('/health-demo')({
  component: HealthDemoPage,
})

function HealthDemoPage() {
  const { data: health, isPending, isError, error } = useQuery(healthQueryOptions)

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Backend Health</h1>
      {isPending && <p className="text-muted-foreground">Checking backend...</p>}
      {isError && (
        <div className="rounded-md border border-destructive p-4 text-destructive">
          <p className="font-medium">Connection failed</p>
          <p className="text-sm mt-1">{error.message}</p>
          <p className="text-xs mt-2 text-muted-foreground">
            Is the backend running? Run: <code>bun run dev</code>
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
