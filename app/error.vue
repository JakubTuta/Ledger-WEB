<template>
  <v-app>
    <v-main class="d-flex align-center gradient-bg justify-center">
      <v-container class="text-center">
        <v-row justify="center">
          <v-col
            cols="12"
            md="6"
          >
            <h1 class="text-h1 font-weight-bold mb-4 text-white">
              {{ error?.statusCode || 500 }}
            </h1>

            <h2 class="text-h5 mb-4 text-white">
              {{ errorTitle }}
            </h2>

            <p
              class="text-body-1 mb-8 text-white"
              style="opacity: 0.8;"
            >
              {{ errorDescription }}
            </p>

            <div class="d-flex ga-4 justify-center">
              <v-btn
                size="large"
                color="white"
                variant="flat"
                @click="handleError"
              >
                <v-icon start>
                  mdi-home
                </v-icon>
                Go Home
              </v-btn>

              <v-btn
                size="large"
                variant="outlined"
                color="white"
                @click="handleError"
              >
                <v-icon start>
                  mdi-refresh
                </v-icon>
                Try Again
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const errorTitle = computed(() => {
  if (props.error?.statusCode === 404) {
    return 'Page Not Found'
  }

  return props.error?.statusMessage || 'Something Went Wrong'
})

const errorDescription = computed(() => {
  if (props.error?.statusCode === 404) {
    return 'The page you\'re looking for doesn\'t exist or has been moved.'
  }

  return 'An unexpected error occurred. Please try again later.'
})

useSeoMeta({
  title: `${props.error?.statusCode || 'Error'} — Ledger`,
  robots: 'noindex, nofollow',
})

useHead({
  titleTemplate: '',
})

const handleError = () => clearError({ redirect: '/' })
</script>

<style scoped>
.gradient-bg {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
  min-height: 100vh;
}
</style>
