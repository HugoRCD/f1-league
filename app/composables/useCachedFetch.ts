import type { UseFetchOptions } from 'nuxt/app'

export function useCachedFetch<T>(url: string, opts?: UseFetchOptions<T>) {
  return useFetch(url, {
    ...opts,
    getCachedData(key, nuxtApp) {
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    },
  })
}
