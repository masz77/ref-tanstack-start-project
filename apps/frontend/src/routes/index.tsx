import { createFileRoute } from '@tanstack/react-router'
import { ComponentExample } from '@/components/component-example'
import { cacheHeaders } from '@/lib/cache-policy'

export const Route = createFileRoute('/')({ component: App, headers: cacheHeaders })

function App() {
  return <ComponentExample />
}
