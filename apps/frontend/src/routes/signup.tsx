import { FingerprintIcon, GoogleLogoIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { passkey, signIn, signUp } from '@/lib/auth-client'
import { cacheHeaders } from '@/lib/cache-policy'
import { useFinalizeSession } from '@/lib/hooks/use-finalize-session'

// Best-effort passkey enrollment. Swallows + reports its own failure so the
// sign-up flow never blocks on it — the user can add a passkey later from a
// settings surface. Kept module-scope to isolate the failure path and keep
// handleEmailSubmit's cognitive complexity down.
async function enrollPasskey(name: string) {
  try {
    await passkey.addPasskey({ name })
  } catch (passkeyErr) {
    // No ToastProvider is mounted at the app root, so there's no toast surface
    // to route this to; fall back to a console warning. This is non-fatal.
    // biome-ignore lint/suspicious/noConsole: best-effort passkey enrollment, non-fatal
    console.warn('Passkey enrollment failed', passkeyErr)
  }
}

export const Route = createFileRoute('/signup')({
  component: SignupPage,
  headers: cacheHeaders,
  beforeLoad: ({ context }) => {
    if (!context.auth || context.auth.isLoading) return
    if (context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
})

function SignupPage() {
  const nameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const finalizeLocalSession = useFinalizeSession()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registerPasskey, setRegisterPasskey] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await signUp.email({ name, email, password })
      if (result?.error) {
        setError(result.error.message ?? 'Sign-up failed')
        return
      }

      // Better-auth's email signup also creates a session, so the user is
      // signed in at this point. If they ticked "register a passkey" we
      // enroll one before navigating — must run while the session is fresh.
      if (registerPasskey) {
        await enrollPasskey(name || email)
      }

      await finalizeLocalSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    try {
      await signIn.social({ provider: 'google', callbackURL: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    }
  }

  return (
    <div className="grid min-h-svh place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Sign up with email, Google, or set up a passkey for fast sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" variant="outline" onClick={handleGoogle} className="h-10 w-full">
            <GoogleLogoIcon weight="bold" />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Jane Doe"
              />
            </div>
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="At least 8 characters"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={registerPasskey}
                onChange={(e) => setRegisterPasskey(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <span className="inline-flex items-center gap-1">
                <FingerprintIcon weight="bold" className="size-4" />
                Register a passkey for faster sign-in next time
              </span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="h-10 w-full">
              {isSubmitting && <SpinnerGapIcon weight="bold" className="animate-spin" />}
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-foreground underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
