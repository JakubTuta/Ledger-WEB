import { createVuetify } from 'vuetify'

import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'app',
      themes: {
        app: {
          dark: true,
          colors: {
            'primary': '#c1b6e0',
            'primary-lighten-1': '#d0c8ea',
            'primary-lighten-2': '#dfd9f0',
            'primary-darken-1': '#a89ec8',
            'primary-darken-2': '#8f86b0',

            'secondary': '#a99cd2',
            'secondary-lighten-1': '#bdb3dd',
            'secondary-lighten-2': '#d1cbe8',
            'secondary-darken-1': '#9185ba',
            'secondary-darken-2': '#796fa2',

            'accent': '#d4b8e0',
            'info': '#9ab8e0',
            'success': '#9fd4b8',
            'warning': '#e0c89a',
            'error': '#e29aa8',

            'background': '#26233a',
            'surface': '#322f45',
            'surface-variant': '#3e3a54',
            'surface-variant-light': '#4a4660',
            'surface-variant-dark': '#2a2738',

            'on-primary': '#1c1530',
            'on-secondary': '#1c1530',
            'on-background': '#e8e4f0',
            'on-surface': '#e8e4f0',
            'on-surface-variant': '#c0bbd4',

            'primary-transparent': '#c1b6e0',
            'secondary-transparent': '#a99cd2',
          },
        },
      },
    },
    defaults: {
      VTextField: {
        variant: 'outlined',
        rounded: 'xl',
      },
      VAutocomplete: {
        variant: 'outlined',
        rounded: 'xl',
      },
      VSelect: {
        variant: 'outlined',
        rounded: 'xl',
      },
      VBtn: {
        variant: 'outlined',
        rounded: 'xl',
      },
      VContainer: {
        style: 'max-width: 1400px',
      },
      VCard: {
        rounded: 'xl',
        width: '100%',
      },
      VTab: {
        rounded: 'xl',
      },
      VListItem: {
        rounded: 'xl',
      },
      VAlert: {
        variant: 'tonal',
        rounded: 'xl',
      },
    },
    display: {
      mobileBreakpoint: 'sm',
    },
  })
  app.vueApp.use(vuetify)
})
