// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',

  devtools: { enabled: true },

  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },],
    },
  },

  nitro: {
    imports: {
      dirs: ['./server/services'],
    },
  },

  css: ['~/assets/css/index.css'],

  image: {
    provider: 'ipx',
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

  auth: {
    redirects: {
      login: '/login',
      guest: '/',
    },
    hubSecondaryStorage: true,
  },

  routeRules: {
    '/admin/**': { auth: { user: { role: 'admin' } } },
    '/races/**': { auth: 'user' },
    '/leaderboard': { auth: 'user' },
    '/login': { auth: 'guest' },
    '/register': { auth: 'guest' },
  },

  icon: {
    customCollections: [
      {
        prefix: 'f1',
        dir: './app/assets/icons',
      }
    ],
  },

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
    },
  },

  modules: [
    '@nuxthub/core',
    '@onmax/nuxt-better-auth',
    'evlog/nuxt',
    '@nuxt/ui',
    '@nuxt/scripts',
    '@nuxt/image',
    '@vueuse/nuxt',
    'motion-v/nuxt',
  ],
})
