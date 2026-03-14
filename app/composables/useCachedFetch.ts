import type { UseFetchOptions } from 'nuxt/app'

export function useCachedFetch<T>(url: MaybeRefOrGetter<string>, opts?: UseFetchOptions<T> & { maxAge?: number }) {
  const { maxAge, ...fetchOpts } = opts ?? {} as UseFetchOptions<T> & { maxAge?: number }
  return useFetch(url, {
    ...fetchOpts,
    getCachedData(key, nuxtApp) {
      const cached = nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
      if (!cached) return undefined
      if (!maxAge) return cached
      const fetchedAt = (nuxtApp.payload as any)._fetchedAt?.[key]
      if (fetchedAt && Date.now() - fetchedAt > maxAge) return undefined
      return cached
    },
  })
}
