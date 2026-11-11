import { revalidatePath } from 'next/cache'

/**
 * Refresh cached public pages after content changes in the admin.
 * Safe to call outside a Next.js request (scripts, migrations): failures are ignored.
 */
export const revalidate = (...paths: string[]) => {
  for (const path of paths) {
    try {
      // Paths with [params] refresh every page of that route.
      if (path.includes('[')) revalidatePath(path, 'page')
      else revalidatePath(path)
    } catch {
      // Not running inside Next.js (for example the seed script) — nothing to refresh.
    }
  }
}

/** Refreshes every cached page (used when something in the shared header or footer changes). */
export const revalidateAll = () => {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // Not running inside Next.js.
  }
}
