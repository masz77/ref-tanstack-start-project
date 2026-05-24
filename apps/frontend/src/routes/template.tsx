import {
  ArrowsClockwiseIcon,
  HeartbeatIcon,
  HouseIcon,
  KeyIcon,
  ListMagnifyingGlassIcon,
  TestTubeIcon,
  TrayIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useId, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  apiIndexQueryOptions,
  healthQueryOptions,
  logsRecentQueryOptions,
  logsStatsQueryOptions,
  testQueryOptions,
} from '@/lib/template/queries'

export const Route = createFileRoute('/template')({
  component: TemplatePage,
  loader: ({ context }) => {
    // Fire-and-forget prefetch of the OPEN endpoints so the cache is warm on
    // paint. The two logs queries need a runtime API key, so they are NOT
    // prefetched here — they stay idle until the user enters a key.
    void context.queryClient.prefetchQuery(healthQueryOptions)
    void context.queryClient.prefetchQuery(apiIndexQueryOptions)
    void context.queryClient.prefetchQuery(testQueryOptions)
  },
})

/**
 * Shared three-state shell for each endpoint card: header (title + icon +
 * refetch button) plus loading / error / idle / data body. Justified
 * abstraction with 5 real callers — children render the success body.
 *
 * State precedence in the body: idle → loading → error → children. This keeps
 * the api-response-handling rule clean: a disabled (idle) logs query never
 * shows a spinner or an error, an errored query never shows an empty state.
 */
type EndpointCardProps = {
  title: string
  description: string
  icon: ReactNode
  isPending: boolean
  isError: boolean
  isFetching: boolean
  error: Error | null
  onRefetch: () => void
  idle?: boolean
  idleMessage?: string
  refetchDisabled?: boolean
  children: ReactNode
}

function EndpointCard({
  title,
  description,
  icon,
  isPending,
  isError,
  isFetching,
  error,
  onRefetch,
  idle = false,
  idleMessage,
  refetchDisabled = false,
  children,
}: EndpointCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRefetch}
            disabled={refetchDisabled || isFetching}
            aria-label={`Refetch ${title}`}
          >
            {/* Wrap the icon so the GPU-accelerated wrapper spins, not the SVG. */}
            <div className={isFetching ? 'animate-spin' : undefined}>
              <ArrowsClockwiseIcon />
            </div>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {idle ? (
          <p className="text-sm text-muted-foreground">{idleMessage}</p>
        ) : isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : isError ? (
          <div className="rounded-md border border-destructive p-3 text-destructive">
            <p className="flex items-center gap-1.5 font-medium">
              <WarningCircleIcon className="size-4" weight="bold" />
              Request failed
            </p>
            <p className="mt-1 text-sm">{error?.message ?? 'Something went wrong'}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

/** A labeled key → value row used across the data bodies. */
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

/** A small stat tile for the logs-stats card. */
function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function statusBadgeVariant(statusCode?: number) {
  if (statusCode === undefined) return 'secondary' as const
  if (statusCode >= 500) return 'destructive' as const
  if (statusCode >= 400) return 'outline' as const
  return 'secondary' as const
}

function TemplatePage() {
  const apiKeyId = useId()
  const [apiKey, setApiKey] = useState('')
  const hasKey = Boolean(apiKey)

  const health = useQuery(healthQueryOptions)
  const apiIndex = useQuery(apiIndexQueryOptions)
  const test = useQuery(testQueryOptions)
  const logsRecent = useQuery(logsRecentQueryOptions(apiKey))
  const logsStats = useQuery(logsStatsQueryOptions(apiKey))

  // A disabled query (no key yet) reports status==='pending' with
  // fetchStatus==='idle'. Treat that as the idle prompt, NOT a loading state.
  const logsIdle = !hasKey

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Template — FE↔BE Integration</h1>
        <p className="mt-1 text-muted-foreground">
          Exercises the typed <code>@/lib/contracts</code> types against the primitive backend APIs
          via TanStack Query — five endpoints, fully inferred end-to-end with no codegen.
        </p>
      </header>

      <section className="mb-6 rounded-md border p-4">
        <Label htmlFor={apiKeyId} className="mb-2">
          <KeyIcon className="size-4" />
          Logs API key
        </Label>
        <PasswordInput
          id={apiKeyId}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste the x-api-key for /v1/logs/*"
          autoComplete="off"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          The logs endpoints require the <code>LOGS_API_KEY</code> via the <code>x-api-key</code>{' '}
          header. The key is held only in memory for this session — never persisted nor bundled.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. Health — GET /health */}
        <EndpointCard
          title="Health"
          description="GET /health"
          icon={<HeartbeatIcon className="size-5" />}
          isPending={health.isPending}
          isError={health.isError}
          isFetching={health.isFetching}
          error={health.error}
          onRefetch={() => void health.refetch()}
        >
          {health.data && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary" className="capitalize">
                  {health.data.status}
                </Badge>
              </div>
              <InfoRow label="Version" value={health.data.version} />
              <InfoRow label="Uptime" value={`${health.data.uptime}s`} />
              <InfoRow
                label="Timestamp"
                value={new Date(health.data.timestamp).toLocaleTimeString()}
              />
            </div>
          )}
        </EndpointCard>

        {/* 2. API Index — GET / */}
        <EndpointCard
          title="API Index"
          description="GET /"
          icon={<HouseIcon className="size-5" />}
          isPending={apiIndex.isPending}
          isError={apiIndex.isError}
          isFetching={apiIndex.isFetching}
          error={apiIndex.error}
          onRefetch={() => void apiIndex.refetch()}
        >
          {apiIndex.data && (
            <div className="space-y-2">
              <InfoRow label="Message" value={apiIndex.data.message} />
              <InfoRow label="Version" value={apiIndex.data.version} />
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Endpoints</p>
                {Object.entries(apiIndex.data.endpoints).map(([key, value]) => (
                  <div key={key} className="flex items-baseline justify-between gap-4">
                    <span className="text-sm capitalize">{key}</span>
                    <code className="text-xs text-muted-foreground">{value}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </EndpointCard>

        {/* 3. Test / DB round-trip — GET /test (201, D1 write + read) */}
        <EndpointCard
          title="Test / DB round-trip"
          description="GET /test"
          icon={<TestTubeIcon className="size-5" />}
          isPending={test.isPending}
          isError={test.isError}
          isFetching={test.isFetching}
          error={test.error}
          onRefetch={() => void test.refetch()}
        >
          {test.data && (
            <div className="space-y-2">
              <InfoRow label="Message" value={test.data.message} />
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted-foreground">Generated id</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium break-all">
                  {test.data.id}
                </code>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Returns 201 — each load/refetch inserts a fresh <code>apiLogs</code> row in D1 and
                reads back its id, proving a live write + read round-trip.
              </p>
            </div>
          )}
        </EndpointCard>

        {/* 4. Recent Logs — GET /v1/logs/recent (needs api key) */}
        <EndpointCard
          title="Recent Logs"
          description="GET /v1/logs/recent"
          icon={<ListMagnifyingGlassIcon className="size-5" />}
          isPending={logsRecent.isPending}
          isError={logsRecent.isError}
          isFetching={logsRecent.isFetching}
          error={logsRecent.error}
          onRefetch={() => void logsRecent.refetch()}
          idle={logsIdle}
          idleMessage="Enter the logs API key above to load recent logs."
          refetchDisabled={!hasKey}
        >
          {logsRecent.data &&
            (logsRecent.data.length === 0 ? (
              <EmptyState
                icon={TrayIcon}
                title="No logs found"
                description="The backend returned no recent log entries."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsRecent.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.method}</TableCell>
                      <TableCell className="max-w-[12rem] truncate">{log.path}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(log.statusCode)}>
                          {log.statusCode ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {log.duration !== undefined ? `${log.duration}ms` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}
        </EndpointCard>

        {/* 5. Logs Stats — GET /v1/logs/stats (needs api key) */}
        <EndpointCard
          title="Logs Stats"
          description="GET /v1/logs/stats"
          icon={<ListMagnifyingGlassIcon className="size-5" />}
          isPending={logsStats.isPending}
          isError={logsStats.isError}
          isFetching={logsStats.isFetching}
          error={logsStats.error}
          onRefetch={() => void logsStats.refetch()}
          idle={logsIdle}
          idleMessage="Enter the logs API key above to load stats."
          refetchDisabled={!hasKey}
        >
          {logsStats.data && (
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Total" value={logsStats.data.total} />
              <StatTile label="Errors" value={logsStats.data.errors} />
              <StatTile
                label="Avg duration"
                value={
                  logsStats.data.avgDuration !== null ? `${logsStats.data.avgDuration}ms` : '—'
                }
              />
              <StatTile label="Error rate" value={logsStats.data.errorRate} />
              <StatTile label="Requests (24h)" value={logsStats.data.totalRequests24h} />
              <StatTile
                label="Max duration"
                value={
                  logsStats.data.maxDuration !== null ? `${logsStats.data.maxDuration}ms` : '—'
                }
              />
            </div>
          )}
        </EndpointCard>
      </div>
    </div>
  )
}
