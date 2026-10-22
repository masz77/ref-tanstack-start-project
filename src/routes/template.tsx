import {
  ArrowsClockwiseIcon,
  HeartbeatIcon,
  HouseIcon,
  TestTubeIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  apiIndexQueryOptions,
  healthQueryOptions,
  testQueryOptions,
} from '@/lib/template/queries'

export const Route = createFileRoute('/template')({
  component: TemplatePage,
  loader: ({ context }) => {
    // why: browser only. SSR must not fill the module-level QueryClient, which is shared across requests, and the prefetched data would not match the client's pending first render.
    if (typeof window === 'undefined') return

    // Fire-and-forget prefetch of the server-function queries so the cache is warm on paint.
    void context.queryClient.prefetchQuery(healthQueryOptions)
    void context.queryClient.prefetchQuery(apiIndexQueryOptions)
    void context.queryClient.prefetchQuery(testQueryOptions)
  },
})

/**
 * Shared three-state shell for each endpoint card: header (title + icon +
 * refetch button) plus loading / error / data body.
 *
 * State precedence in the body: loading → error → children, so an errored query
 * never shows an empty state.
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
            disabled={isFetching}
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
        {isPending ? (
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

function TemplatePage() {
  const health = useQuery(healthQueryOptions)
  const apiIndex = useQuery(apiIndexQueryOptions)
  const test = useQuery(testQueryOptions)

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Template — FE↔BE Integration</h1>
        <p className="mt-1 text-muted-foreground">
          Loads data through TanStack server functions via TanStack Query — three endpoints, fully
          inferred end-to-end with no codegen.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. Health — getHealth() */}
        <EndpointCard
          title="Health"
          description="getHealth()"
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

        {/* 2. API Index — getIndex() */}
        <EndpointCard
          title="API Index"
          description="getIndex()"
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

        {/* 3. Test / DB round-trip — getDatabaseCheck() */}
        <EndpointCard
          title="Test / DB round-trip"
          description="getDatabaseCheck()"
          icon={<TestTubeIcon className="size-5" />}
          isPending={test.isPending}
          isError={test.isError}
          isFetching={test.isFetching}
          error={test.error}
          onRefetch={() => void test.refetch()}
        >
          {test.data && <InfoRow label="Message" value={test.data.message} />}
        </EndpointCard>
      </div>
    </div>
  )
}
