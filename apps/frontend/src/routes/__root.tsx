import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { NotFound } from '@/components/not-found'
import { useSessionChannel } from '@/lib/hooks/use-session-channel'
import { AuthSync, type SessionContextValue, SessionProvider } from '@/lib/session-context'
import { queryClient } from '@/router'

import appCss from '../styles.css?url'

// 2026-05-29: Context type extended with `auth`. Synchronous beforeLoad guards
// read `context.auth` (early-return while `isLoading`) and never block. The
// `auth` value is injected at runtime by AuthSync once SessionProvider's
// useSessionQuery resolves. See docs/ARCHITECT/auth.md.
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  auth: SessionContextValue
}>()({
  notFoundComponent: NotFound,
  component: RootComponent,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootComponent() {
  // 2026-05-29: useSessionChannel listens to cross-tab BroadcastChannel sign-in
  // / sign-out events and mutates the ['session'] react-query cache so route
  // guards in other tabs re-evaluate within ~1 frame.
  useSessionChannel()
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AuthSync />
        <Outlet />
      </SessionProvider>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              {
                name: 'Tanstack Query',
                render: <ReactQueryDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
