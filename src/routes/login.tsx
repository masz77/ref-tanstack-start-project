import { FingerprintIcon, GoogleLogoIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { signIn } from '@/lib/auth-client'
import { cacheHeaders } from '@/lib/cache-policy'
import { useFinalizeSession } from '@/lib/hooks/use-finalize-session'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  // Synchronous guard reads injected `context.auth` (no blocking SSR fetch).
  // Already-signed-in users land on /. While auth is unresolved we
  // early-return so the login page paints immediately (AuthSync re-runs this
  // once auth settles).
  // why: beforeLoad must precede headers — TanStack Start infers route types in
  // property order, and placing it after headers breaks context type inference.
  beforeLoad: ({ context }) => {
    if (!context.auth || context.auth.isLoading) return
    if (context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
  headers: cacheHeaders,
})

function LoginPage() {
  const emailId = useId()
  const passwordId = useId()
  const finalizeLocalSession = useFinalizeSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await signIn.email({ email, password })
      if (result?.error) {
        setError(result.error.message ?? 'Invalid email or password')
        return
      }
      await finalizeLocalSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    try {
      // better-auth redirects the browser to Google; after the callback the
      // page reloads at `callbackURL`, SessionProvider's query fetches
      // /api/session and the cache populates. No need to call
      // finalizeLocalSession here — the redirect flow handles it.
      await signIn.social({ provider: 'google', callbackURL: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    }
  }

  const handlePasskey = async () => {
    if (isPasskeyLoading) return
    setError(null)
    setIsPasskeyLoading(true)
    try {
      const result = await signIn.passkey()
      if (result?.error) {
        setError(result.error.message ?? 'Passkey sign-in failed')
        return
      }
      await finalizeLocalSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey sign-in failed')
    } finally {
      setIsPasskeyLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back. Use email, Google, or a passkey.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button type="button" variant="outline" onClick={handleGoogle} className="h-10 w-full">
              <GoogleLogoIcon weight="bold" />
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePasskey}
              disabled={isPasskeyLoading}
              className="h-10 w-full"
            >
              {isPasskeyLoading ? (
                <SpinnerGapIcon weight="bold" className="animate-spin" />
              ) : (
                <FingerprintIcon weight="bold" />
              )}
              Sign in with passkey
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={passwordId}>Password</Label>
              <PasswordInput
                id={passwordId}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="h-10 w-full">
              {isSubmitting && <SpinnerGapIcon weight="bold" className="animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link to="/signup" className="font-medium text-foreground underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
