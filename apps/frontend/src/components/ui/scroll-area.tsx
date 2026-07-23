// ScrollArea — usage & design notes: ./scroll-area.md

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@/lib/utils'

function ScrollArea({ className, children, ...props }: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        // why: overscroll-contain stops scroll-chaining to the page at this region's
        // edges while KEEPING the local rubber-band (contain ≠ none) — the native
        // elasticity-at-boundary feel for a bounded scroller.
        className="size-full rounded-[inherit] overscroll-contain transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      // why: mirror the global macOS-overlay CSS as a component — thin inset gutter,
      // auto-hide knob that fades in on scroll/hover. Base UI toggles data-hovering/
      // data-scrolling, so the fade is native and identical on every OS (the overlay
      // fade CSS-only can't do on Windows/Linux).
      className={cn(
        'flex touch-none p-px opacity-0 transition-opacity duration-150 select-none data-hovering:opacity-100 data-scrolling:opacity-100 data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent',
        className,
      )}
      {...props}
    >
      {/* Translucent foreground pill — same 30% → 50%-on-hover as globals.css. */}
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-foreground/30 transition-colors hover:bg-foreground/50"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
