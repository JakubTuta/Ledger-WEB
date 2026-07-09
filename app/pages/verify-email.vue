<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card
      class="w-100 pa-4"
      style="max-width: 400px;"
    >
      <v-card-title class="d-flex flex-column align-center mb-4 justify-center">
        <v-icon
          :color="status === 'success'
            ? 'success'
            : status === 'error'
              ? 'error'
              : undefined"
          size="48"
          class="mb-4"
        >
          {{ status === 'success'
            ? 'mdi-check-circle'
            : status === 'error'
              ? 'mdi-alert-circle'
              : 'mdi-email-fast-outline' }}
        </v-icon>

        <span class="text-h5">Email Verification</span>
      </v-card-title>

      <v-card-text class="text-center">
        <p v-if="status === 'pending'">
          Verifying your email address…
        </p>

        <v-alert
          v-else-if="status === 'success'"
          type="success"
          density="compact"
        >
          {{ message }}
        </v-alert>

        <v-alert
          v-else
          type="error"
          density="compact"
        >
          {{ message }}
        </v-alert>

        <v-btn
          class="mt-6"
          color="primary"
          :to="authStore.isAuthenticated
            ? '/account'
            : '/login'"
        >
          {{ authStore.isAuthenticated
            ? 'Go to account'
            : 'Go to login' }}
        </v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: [],
})

useSeoMeta({
  title: 'Verify Email',
  robots: 'noindex, nofollow',
})

const authStore = useAuthStore()
const route = useRoute()

const status = ref<'pending' | 'success' | 'error'>('pending')
const message = ref('')

onMounted(async () => {
  const token = route.query.token
  if (!token || typeof token !== 'string') {
    status.value = 'error'
    message.value = 'Missing verification token.'

    return
  }

  const result = await authStore.verifyEmail(token)

  if (result.success) {
    status.value = 'success'
    message.value = result.message || 'Email verified successfully.'
  }
  else {
    status.value = 'error'
    message.value = result.error || 'Invalid or expired verification link.'
  }
})
</script>
