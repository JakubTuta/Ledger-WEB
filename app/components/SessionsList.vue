<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-body-2 text-medium-emphasis">
        Devices/browsers currently signed in to your account.
      </span>

      <v-btn
        size="small"
        variant="outlined"
        color="error"
        :disabled="loading || sessions.length <= 1"
        @click="handleRevokeAllOthers"
      >
        Sign out all other sessions
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

    <v-list
      v-if="!loading"
      lines="two"
    >
      <v-list-item
        v-for="session in sessions"
        :key="session.id"
      >
        <template #prepend>
          <v-icon>mdi-devices</v-icon>
        </template>

        <v-list-item-title>
          {{ session.device_info || 'Unknown device' }}
          <v-chip
            v-if="session.is_current"
            size="x-small"
            color="primary"
            class="ml-2"
          >
            This device
          </v-chip>
        </v-list-item-title>

        <v-list-item-subtitle>
          Created {{ formatDate(session.created_at) }}
          <span v-if="session.last_used_at"> · Last used {{ formatDate(session.last_used_at) }}</span>
        </v-list-item-subtitle>

        <template #append>
          <v-btn
            size="small"
            variant="text"
            color="error"
            :disabled="revokingId === session.id"
            @click="handleRevoke(session.id)"
          >
            Revoke
          </v-btn>
        </template>
      </v-list-item>

      <v-list-item v-if="sessions.length === 0">
        <v-list-item-title class="text-medium-emphasis">
          No active sessions found.
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <v-progress-linear
      v-else
      indeterminate
    />
  </div>
</template>

<script setup lang="ts">
import type { SessionInfo } from '~/types/auth'

const authStore = useAuthStore()

const sessions = ref<SessionInfo[]>([])
const loading = ref(false)
const revokingId = ref<number | null>(null)
const success = ref('')
const error = ref('')

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  }
  catch {
    return iso
  }
}

async function loadSessions() {
  loading.value = true
  error.value = ''

  try {
    const result = await authStore.listSessions()

    if (result.success) {
      sessions.value = result.sessions
    }
    else {
      error.value = result.error || 'Failed to load sessions'
    }
  }
  finally {
    loading.value = false
  }
}

async function handleRevoke(sessionId: number) {
  revokingId.value = sessionId
  success.value = ''
  error.value = ''

  try {
    const result = await authStore.revokeSession(sessionId)

    if (result.success) {
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      success.value = 'Session revoked'
    }
    else {
      error.value = result.error || 'Failed to revoke session'
    }
  }
  finally {
    revokingId.value = null
  }
}

async function handleRevokeAllOthers() {
  success.value = ''
  error.value = ''
  loading.value = true

  try {
    const result = await authStore.revokeAllSessions(false)

    if (result.success) {
      success.value = result.message || 'Other sessions revoked'
      await loadSessions()
    }
    else {
      error.value = result.error || 'Failed to revoke sessions'
    }
  }
  finally {
    loading.value = false
  }
}

onMounted(loadSessions)
</script>
