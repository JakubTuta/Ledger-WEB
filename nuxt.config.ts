/* eslint-disable node/prefer-global/process */
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://ledger.jtuta.cloud'

export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      title: 'Ledger',
      titleTemplate: '%s | Ledger',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'theme-color', content: '#1976D2' },
        { name: 'author', content: 'Ledger Team' },
        { name: 'description', content: 'Open source log analytics for Python backends. Monitor FastAPI, Django, and Flask with real-time dashboards.' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      ],
    },
  },

  build: {
    transpile: ['vuetify'],
  },

  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@nuxtjs/sitemap',
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
  ],

  imports: {
    autoImport: true,
    dirs: [
      'app/stores/**',
      'app/constants/**',
      'app/utils/**',
    ],
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },

  runtimeConfig: {
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL || process.env.SERVER_URL || 'http://localhost:8000',
      siteUrl,
    },
  },

  ssr: true,

  routeRules: {
    '/': { ssr: true },
    '/login': { ssr: false },
    '/register': { ssr: false },
    '/panel': { ssr: false },
    '/alerts': { ssr: false },
    '/account': { ssr: false },
    '/settings': { ssr: false },
  },

  site: {
    url: siteUrl,
    name: 'Ledger',
  },

  sitemap: {
    exclude: ['/login', '/register', '/panel', '/alerts', '/account'],
  },

  nitro: {
    preset: 'bun',
  },

  typescript: {
    strict: true,
  },
})
