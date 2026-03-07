// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',

  devtools: { enabled: true },

  nitro: {
    imports: {
      dirs: ['./server/services']
    }
  },

  css: ['~/assets/css/index.css'],

  image: {
    provider: 'ipx'
  },

  hub: {
    db: 'postgresql',
    kv: true,
    cache: true,
  },

  evlog: {
    env: { service: 'f1-championship' },
    include: ['/api/**'],
  },

  modules: [
    '@nuxthub/core',
    'evlog/nuxt',
    '@nuxt/ui',
    '@nuxt/scripts',
    '@nuxt/image',
    '@vueuse/nuxt',
    'motion-v/nuxt'
  ]
})
