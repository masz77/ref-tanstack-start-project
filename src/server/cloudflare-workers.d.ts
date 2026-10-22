// Minimal ambient declaration for the Cloudflare Workers module.
// why: the full @cloudflare/workers-types package ships global DOM-clashing types
// (Response, fetch, ...), so it cannot be a global `types` entry in this repo.
// Only the surface used by src/server is declared here.
declare module 'cloudflare:workers' {
  // why: reuse the app's Bindings type instead of hand-copying the binding list.
  export const env: import('@/server/env').AppEnv['Bindings']

  export const cache:
    | {
        purge?: (opts: { tags: string[] }) => Promise<unknown>
      }
    | undefined
}
