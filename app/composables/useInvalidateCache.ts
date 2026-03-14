export function useInvalidateCache() {
  const nuxtApp = useNuxtApp()

  return (...keys: string[]) => {
    for (const key of keys) {
      delete nuxtApp.payload.data[key]
    }
  }
}
