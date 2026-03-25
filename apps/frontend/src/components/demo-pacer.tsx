import {
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SpinnerGapIcon,
  StackIcon,
} from '@phosphor-icons/react'
import { useBatcher, useDebouncedValue, useThrottler } from '@tanstack/react-pacer'
import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function DebouncedSearch() {
  const [searchQuery, setSearchQuery] = useState('')

  const [debouncedQuery, debouncer] = useDebouncedValue(searchQuery, { wait: 500 }, (state) => ({
    isPending: state.isPending,
  }))

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MagnifyingGlassIcon className="size-5" />
          Debounced Search
        </CardTitle>
        <CardDescription>
          Type to see debouncing in action. The debounced value updates 500ms after you stop typing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Type to search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-28 shrink-0">Instant value:</span>
            <Badge variant="outline" className="font-mono">
              {searchQuery || '(empty)'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-28 shrink-0">Debounced:</span>
            <Badge variant="secondary" className="font-mono">
              {debouncedQuery || '(empty)'}
            </Badge>
            {debouncer.isPending && (
              <SpinnerGapIcon className="text-muted-foreground size-4 animate-spin" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ThrottledCounter() {
  const [rawCount, setRawCount] = useState(0)
  const [throttledValue, setThrottledValue] = useState(0)

  const throttler = useThrottler(setThrottledValue, { wait: 1000 }, (state) => ({
    executionCount: state.executionCount,
  }))

  const handleClick = () => {
    const next = rawCount + 1
    setRawCount(next)
    throttler.maybeExecute(next)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FunnelIcon className="size-5" />
          Throttled Counter
        </CardTitle>
        <CardDescription>
          Click rapidly. The throttled value updates at most once per 1000ms.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleClick}>
          <PlusIcon data-icon="inline-start" />
          Increment
        </Button>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-32 shrink-0">Raw clicks:</span>
            <Badge variant="outline" className="font-mono tabular-nums">
              {rawCount}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-32 shrink-0">Throttled value:</span>
            <Badge variant="secondary" className="font-mono tabular-nums">
              {throttledValue}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-32 shrink-0">Executions:</span>
            <Badge variant="default" className="font-mono tabular-nums">
              {throttler.executionCount}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BatchedLogger() {
  const [inputValue, setInputValue] = useState('')
  const [processedBatches, setProcessedBatches] = useState<string[][]>([])

  const handleBatch = useCallback((items: string[]) => {
    setProcessedBatches((prev) => [...prev, items])
  }, [])

  const batcher = useBatcher<string>(handleBatch, { maxSize: 5, wait: 3000 }, (state) => ({
    size: state.size,
    executionCount: state.executionCount,
    totalItemsProcessed: state.totalItemsProcessed,
  }))

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    batcher.addItem(trimmed)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StackIcon className="size-5" />
          Batched Logger
        </CardTitle>
        <CardDescription>
          Add items to the queue. The batch processes when it reaches 5 items or after 3 seconds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add an item..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleAdd} disabled={!inputValue.trim()}>
            <PlusIcon data-icon="inline-start" />
            Add
          </Button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-36 shrink-0">Queue size:</span>
            <Badge variant="outline" className="font-mono tabular-nums">
              {batcher.size} / 5
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-36 shrink-0">Batches processed:</span>
            <Badge variant="secondary" className="font-mono tabular-nums">
              {batcher.executionCount}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-36 shrink-0">Total items sent:</span>
            <Badge variant="default" className="font-mono tabular-nums">
              {batcher.totalItemsProcessed}
            </Badge>
          </div>
        </div>
        {processedBatches.length > 0 && (
          <div className="space-y-2">
            <span className="text-muted-foreground text-xs font-medium">Processed batches:</span>
            <div className="space-y-1">
              {processedBatches.map((batch, i) => (
                <div
                  key={`batch-${i}-${batch.join('-')}`}
                  className="bg-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-xs"
                >
                  <ClockIcon className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="text-muted-foreground shrink-0">Batch {i + 1}:</span>
                  <span className="font-mono">{batch.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DemoPacer() {
  return (
    <div className="flex w-full flex-col gap-6">
      <DebouncedSearch />
      <ThrottledCounter />
      <BatchedLogger />
    </div>
  )
}
