// SearchField — usage & design notes: ./search-field.md

import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import * as React from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

type SearchFieldProps = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  'value' | 'defaultValue' | 'onChange'
> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onClear?: () => void
  /** Recent searches — when supplied, the leading button opens a menu of them,
   *  mirroring NSSearchFieldCell.searchMenuTemplate. */
  recentSearches?: string[]
  onRecentSelect?: (term: string) => void
}

function SearchField({
  className,
  value,
  defaultValue = '',
  onValueChange,
  onClear,
  recentSearches,
  onRecentSelect,
  placeholder = 'Search',
  ...props
}: SearchFieldProps) {
  // why: controlled when `value` is passed, else self-managed — matches the
  // native field so a consumer can own the text or just drop it in.
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(defaultValue)
  const text = isControlled ? value : internal

  const setText = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  const hasText = text.length > 0
  const hasMenu = recentSearches !== undefined && recentSearches.length > 0

  return (
    <InputGroup className={className}>
      {/* Leading search button — opens the recent-search menu when provided
          (NSSearchFieldCell.searchMenuTemplate), otherwise a static glyph. */}
      {hasMenu ? (
        <DropdownMenu>
          <InputGroupAddon>
            <DropdownMenuTrigger
              render={
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Recent searches"
                  className="text-muted-foreground"
                >
                  <MagnifyingGlassIcon weight="bold" className="size-3.5" />
                </InputGroupButton>
              }
            />
          </InputGroupAddon>
          <DropdownMenuContent align="start" className="min-w-48">
            <DropdownMenuLabel>Recent searches</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentSearches?.map((term) => (
              <DropdownMenuItem
                key={term}
                onClick={() => {
                  setText(term)
                  onRecentSelect?.(term)
                }}
              >
                {term}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <InputGroupAddon>
          <MagnifyingGlassIcon weight="bold" className="text-muted-foreground size-3.5" />
        </InputGroupAddon>
      )}

      <InputGroupInput
        type="search"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        // why: strip WebKit's native search decorations so only our leading/
        // trailing controls show — otherwise a duplicate clear "×" appears.
        className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
        {...props}
      />

      {/* Trailing cancel — present ONLY when there is text, like NSSearchField. */}
      {hasText ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Clear search"
            className="text-muted-foreground"
            onClick={() => {
              setText('')
              onClear?.()
            }}
          >
            <XIcon weight="bold" className="size-3.5" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}

export { SearchField }
