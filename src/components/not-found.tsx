import { Link } from '@tanstack/react-router'
import { House } from '@phosphor-icons/react'

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-8xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-semibold text-foreground">
        Page not found
      </h1>
      <p className="max-w-md text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <House className="size-4" weight="bold" />
        Back to home
      </Link>
    </div>
  )
}
