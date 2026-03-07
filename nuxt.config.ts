// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',

  devtools: { enabled: true },

  app: {
    head: {
      title: 'F1 League',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      meta: [
        { name: 'description', content: 'Predict the F1 Top 10 for every Grand Prix. Compete with friends across the season.' },
        { property: 'og:title', content: 'F1 League' },
        { property: 'og:description', content: 'Predict the F1 Top 10 for every Grand Prix. Compete with friends across the season.' },
        { property: 'og:image', content: '/og.png' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: '/og.png' },
      ],
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
