'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import * as React from 'react'

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i + 1}`,
  category: ['Design', 'Engineering', 'Marketing', 'Sales', 'Support'][i % 5],
  value: Math.round(Math.random() * 1000),
}))

export function DemoVirtual() {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  })

  return (
    <div className="w-full space-y-2">
      <p className="text-muted-foreground text-sm">
        Rendering {items.length.toLocaleString()} rows — only visible items are in the DOM.
      </p>
      <div
        ref={parentRef}
        className="border-border bg-card w-full overflow-auto rounded-md border"
        style={{ height: 360 }}
      >
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index]
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                className={`border-border absolute left-0 top-0 flex w-full items-center gap-4 border-b px-4 text-sm ${
                  virtualRow.index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <span className="text-muted-foreground w-12 shrink-0 tabular-nums">
                  {item.id + 1}
                </span>
                <span className="flex-1 truncate font-medium">{item.name}</span>
                <span className="text-muted-foreground w-24 shrink-0 text-right text-xs">
                  {item.category}
                </span>
                <span className="w-16 shrink-0 text-right tabular-nums">{item.value}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
