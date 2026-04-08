import { SpinnerGap } from '@phosphor-icons/react'

function ContentLoader() {
  return (
    <div data-slot="content-loader" className="flex h-48 items-center justify-center">
      <SpinnerGap className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}

export { ContentLoader }
