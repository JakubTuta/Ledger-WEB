<template>
  <div>
    <div class="d-flex align-center ga-2 mb-4 flex-wrap">
      <v-chip
        :color="authStore.user?.totp_enabled
          ? 'success'
          : 'default'"
        :prepend-icon="authStore.user?.totp_enabled
          ? 'mdi-shield-check'
          : 'mdi-shield-off-outline'"
        size="small"
      >
        Two-factor authentication: {{ authStore.user?.totp_enabled
          ? 'Enabled'
          : 'Disabled' }}
      </v-chip>

      <v-btn
        v-if="!authStore.user?.totp_enabled && !setupState"
        size="small"
        variant="outlined"
        color="primary"
        @click="startSetup"
      >
        Enable 2FA
      </v-btn>

      <v-btn
        v-if="authStore.user?.totp_enabled"
        size="small"
        variant="outlined"
        color="error"
        @click="showDisableForm = !showDisableForm"
      >
        Disable 2FA
      </v-btn>
    </div>

    <!-- Setup step 1: show secret / provisioning URI -->
    <v-card
      v-if="setupState === 'pending'"
      variant="outlined"
      class="mb-4 pa-4"
    >
      <p class="text-body-2 mb-2">
        Scan this in your authenticator app (Google Authenticator, 1Password, Authy, …).
        No QR scanner? Enter the secret manually.
      </p>

      <div class="mb-2">
        <div class="text-caption text-medium-emphasis">
          Provisioning URI (scan/import in an authenticator app that supports URI import)
        </div>

        <v-text-field
          :model-value="provisioningUri"
          readonly
          variant="outlined"
          density="compact"
          class="mt-1"
        >
          <template #append-inner>
            <v-icon
              class="cursor-pointer"
              @click="copyToClipboard(provisioningUri)"
            >
              mdi-content-copy
            </v-icon>
          </template>
        </v-text-field>
      </div>

      <div class="mb-4">
        <div class="text-caption text-medium-emphasis">
          Manual entry secret
        </div>

        <v-text-field
          :model-value="secret"
          readonly
          variant="outlined"
          density="compact"
          class="mt-1"
        >
          <template #append-inner>
            <v-icon
              class="cursor-pointer"
              @click="copyToClipboard(secret)"
            >
              mdi-content-copy
            </v-icon>
          </template>
        </v-text-field>
      </div>

      <v-text-field
        v-model="verifyCode"
        label="Enter the 6-digit code from your app"
        variant="outlined"
        density="compact"
        maxlength="6"
        class="mb-2"
      />

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

      <div class="d-flex ga-2">
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!verifyCode"
          @click="handleVerifySetup"
        >
          Confirm & Enable
        </v-btn>

        <v-btn
          variant="text"
          :disabled="loading"
          @click="cancelSetup"
        >
          Cancel
        </v-btn>
      </div>
    </v-card>

    <!-- Setup step 2: show backup codes ONCE -->
    <v-card
      v-if="setupState === 'done'"
      variant="outlined"
      class="mb-4 pa-4"
    >
      <v-alert
        type="warning"
        density="compact"
        class="mb-4"
      >
        Save these backup codes now — each can be used once if you lose access to your
        authenticator app, and they will not be shown again.
      </v-alert>

      <div class="backup-codes mb-4">
        <code
          v-for="code in backupCodes"
          :key="code"
          class="backup-code"
        >{{ code }}</code>
      </div>

      <v-checkbox
        v-model="backupCodesSaved"
        label="I've saved these backup codes somewhere safe"
        density="compact"
        hide-details
        class="mb-2"
      />

      <v-btn
        color="primary"
        :disabled="!backupCodesSaved"
        @click="finishSetup"
      >
        Done
      </v-btn>
    </v-card>

    <!-- Disable form -->
    <v-card
      v-if="showDisableForm"
      variant="outlined"
      class="pa-4"
    >
      <v-text-field
        v-model="disablePassword"
        label="Current password"
        type="password"
        variant="outlined"
        density="compact"
        class="mb-2"
      />

      <v-alert
        v-if="disableError"
        type="error"
        density="compact"
        class="mb-4"
        closable
        @click:close="disableError = ''"
      >
        {{ disableError }}
      </v-alert>

      <div class="d-flex ga-2">
        <v-btn
          color="error"
          :loading="disableLoading"
          :disabled="!disablePassword"
          @click="handleDisable"
        >
          Disable 2FA
        </v-btn>

        <v-btn
          variant="text"
          :disabled="disableLoading"
          @click="showDisableForm = false; disablePassword = ''; disableError = ''"
        >
          Cancel
        </v-btn>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()

const setupState = ref<'pending' | 'done' | null>(null)
const secret = ref('')
const provisioningUri = ref('')
const verifyCode = ref('')
const backupCodes = ref<string[]>([])
const backupCodesSaved = ref(false)
const loading = ref(false)
const error = ref('')

const showDisableForm = ref(false)
const disablePassword = ref('')
const disableLoading = ref(false)
const disableError = ref('')

async function startSetup() {
  error.value = ''
  const result = await authStore.setup2FA()

  if (result.success) {
    secret.value = result.secret || ''
    provisioningUri.value = result.provisioningUri || ''
    setupState.value = 'pending'
  }
  else {
    error.value = result.error || 'Failed to start 2FA setup'
  }
}

function cancelSetup() {
  setupState.value = null
  secret.value = ''
  provisioningUri.value = ''
  verifyCode.value = ''
  error.value = ''
}

async function handleVerifySetup() {
  if (!verifyCode.value)
    return

  loading.value = true
  error.value = ''

  try {
    const result = await authStore.verify2FASetup(verifyCode.value)

    if (result.success) {
      backupCodes.value = result.backupCodes || []
      setupState.value = 'done'
    }
    else {
      error.value = result.error || 'Invalid verification code'
    }
  }
  finally {
    loading.value = false
  }
}

function finishSetup() {
  setupState.value = null
  secret.value = ''
  provisioningUri.value = ''
  verifyCode.value = ''
  backupCodes.value = []
  backupCodesSaved.value = false
}

async function handleDisable() {
  if (!disablePassword.value)
    return

  disableLoading.value = true
  disableError.value = ''

  try {
    const result = await authStore.disable2FA({ password: disablePassword.value })

    if (result.success) {
      showDisableForm.value = false
      disablePassword.value = ''
    }
    else {
      disableError.value = result.error || 'Failed to disable 2FA'
    }
  }
  finally {
    disableLoading.value = false
  }
}

async function copyToClipboard(value: string) {
  if (import.meta.client && navigator.clipboard) {
    await navigator.clipboard.writeText(value)
  }
}
</script>

<style scoped>
.backup-codes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.backup-code {
  font-family: monospace;
  font-size: 0.95rem;
  padding: 4px 8px;
  background: rgba(128, 128, 128, 0.12);
  border-radius: 4px;
  text-align: center;
}
</style>
