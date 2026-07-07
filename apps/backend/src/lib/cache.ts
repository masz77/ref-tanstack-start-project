// Guarded cache purge-by-tag. Cloudflare-only; no-ops everywhere else.
type CachePurger = { purge?: (opts: { tags: string[] }) => Promise<unknown> };

// why: memoized at module scope — off-Cloudflare the import rejects once and we keep the
// null, instead of re-attempting (and re-failing) on every call. Guarded (.catch) so a
// non-Cloudflare runtime (vitest/Node/Bun) no-ops instead of crashing; a static
// `import "cloudflare:workers"` would throw at module load on those runtimes.
const cfWorkers = import("cloudflare:workers").catch(() => null) as Promise<{
  cache?: CachePurger;
} | null>;

let warnedNoPurge = false;

export async function purgeCacheTags(
  tags: string[],
): Promise<{ success: boolean; errors?: unknown }> {
  try {
    const mod = await cfWorkers;
    if (mod?.cache?.purge) {
      await mod.cache.purge({ tags });
      return { success: true };
    }
    if (!warnedNoPurge) {
      warnedNoPurge = true;
      console.warn("purgeCacheTags: cache.purge unavailable — off-Cloudflare, purges are a no-op");
    }
    return { success: false, errors: "cache purge unavailable in this runtime" };
  } catch (errors) {
    return { success: false, errors };
  }
}
