<template>
  <div>
    <div class="d-flex align-center ga-2 mb-2 flex-wrap">
      <v-chip
        :color="authStore.user?.email_verified
          ? 'success'
          : 'warning'"
        :prepend-icon="authStore.user?.email_verified
          ? 'mdi-check-decagram'
          : 'mdi-alert-circle-outline'"
        size="small"
      >
        {{ authStore.user?.email_verified
          ? 'Email verified'
          : 'Email not verified' }}
      </v-chip>

      <v-btn
        v-if="!authStore.user?.email_verified"
        size="small"
        variant="outlined"
        :loading="loading"
        :disabled="cooldown > 0"
        @click="handleResend"
      >
        {{ cooldown > 0
          ? `Resend (${cooldown}s)`
          : 'Resend verification email' }}
      </v-btn>
    </div>

    <v-alert
      v-if="success"
      type="success"
      density="compact"
      class="mb-4"
      closable
      @click:close="success = ''"
    >
      {{ success }}
    </v-alert>

    <v-alert
      v-if="error"
      type="error"
      density="compact"
      class="mb-4"
      closable
      @click:close="error = ''"
    >
      {{ error }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()

const loading = ref(false)
const success = ref('')
const error = ref('')
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | undefined

function startCooldown(seconds = 60) {
  cooldown.value = seconds
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
    }
  }, 1000)
}

onUnmounted(() => {
  if (cooldownTimer)
    clearInterval(cooldownTimer)
})

async function handleResend() {
  loading.value = true
  success.value = ''
  error.value = ''

  try {
    const result = await authStore.resendVerification()

    if (result.success) {
      success.value = result.alreadyVerified
        ? 'Your email is already verified.'
        : (result.message || 'Verification email sent — check your inbox.')
      startCooldown()
    }
    else {
      error.value = result.error || 'Failed to send verification email'
    }
  }
  finally {
    loading.value = false
  }
}
</script>
