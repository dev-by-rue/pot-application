export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: [
    '@nuxt/a11y',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@nuxt/test-utils',
  ],
  css: ['~/assets/css/main.css'],
  fonts: {
    families: [
      { name: 'Source Sans 3', provider: 'google', weights: [400, 600, 700] },
    ],
  },
  ui: {
    colorMode: false,
  },
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      title: 'Pot — Personal Budget',
    },
  },
})