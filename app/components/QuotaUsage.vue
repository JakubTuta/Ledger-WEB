<template>
  <div class="d-flex flex-column position-relative h-100 pa-2">
    <!-- Refresh Button - Top Right -->
    <div class="position-absolute right-10px top-10px">
      <div class="d-flex flex-column align-center">
        <v-btn
          variant="text"
          icon
          color="info"
          :disabled="isRefreshDisabled"
          :loading="isLoading"
          @click="handleRefresh"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>

      <div
        v-if="nextRefreshTime && isRefreshDisabled"
        class="text-caption text-grey text-center font-italic"
      >
        Available in {{ timeUntilRefresh }}
      </div>
    </div>

    <!-- Signal Meters Section -->
    <div class="d-flex flex-column flex-1-1 justify-center">
      <h3 class="text-h5 mb-2">
        {{ projectName }}
      </h3>

      <div class="text-caption text-grey mb-4 font-italic">
        {{ environment }}
      </div>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ error }}

        <template #append>
          <v-btn
            size="small"
            variant="text"
            :loading="isLoading"
            @click="handleRefresh"
          >
            Retry
          </v-btn>
        </template>
      </v-alert>

      <v-skeleton-loader
        v-else-if="isLoading && !quotaData"
        type="list-item-three-line"
      />

      <div
        v-else-if="!quotaData"
        class="text-body-2 text-grey"
      >
        No quota usage recorded for this project yet.
      </div>

      <template v-else>
        <div
          v-for="signal in signalMeters"
          :key="signal.label"
          class="mb-4"
        >
          <div class="d-flex justify-space-between align-center mb-1">
            <span class="text-subtitle-2">{{ signal.label }}</span>

            <span class="text-caption text-grey">
              {{ signal.usage.toLocaleString() }} / {{ signal.quota.toLocaleString() }}
            </span>
          </div>

          <v-progress-linear
            :model-value="signal.percentage"
            :color="signal.color"
            height="20"
            rounded
          >
            <template #default>
              <strong class="text-caption text-white">{{ signal.percentage }}%</strong>
            </template>
          </v-progress-linear>
        </div>

        <div class="mt-2 text-center">
          <div class="text-h6 font-weight-bold">
            {{ timeUntilReset }}
          </div>

          <div class="text-caption text-grey mt-1">
            until quota reset
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectQuotaResponse, SignalQuota } from '~/types/quota'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  projectId: number
  projectName: string
  environment: string
  quotaData: ProjectQuotaResponse | null
  isLoading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  refresh: [projectId: number]
}>()

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000
const nextRefreshTime = ref<Date | null>(null)
const currentTime = ref(new Date())
let intervalId: NodeJS.Timeout | null = null

const localStorageKey = computed(() => `quota-refresh-${props.projectId}`)

function loadNextRefreshTimeFromStorage() {
  if (typeof window === 'undefined')
    return

  const stored = localStorage.getItem(localStorageKey.value)
  if (stored) {
    const date = new Date(stored)
    if (!Number.isNaN(date.getTime()) && date > new Date()) {
      nextRefreshTime.value = date
    }
    else {
      localStorage.removeItem(localStorageKey.value)
    }
  }
}

function saveNextRefreshTimeToStorage(date: Date) {
  if (typeof window === 'undefined')
    return

  localStorage.setItem(localStorageKey.value, date.toISOString())
}

function percentageFor(signal: SignalQuota): number {
  if (signal.quota === 0)
    return 0

  const percentage = Math.round((signal.usage / signal.quota) * 100)

  return Number.isNaN(percentage)
    ? 0
    : percentage
}

function colorFor(percentage: number): string {
  if (percentage >= 90)
    return 'error'
  if (percentage >= 75)
    return 'warning'

  return 'success'
}

const EMPTY_SIGNAL: SignalQuota = { quota: 0, usage: 0, remaining: 0 }

const signalMeters = computed(() => {
  const signals = [
    { label: 'Logs', data: props.quotaData?.logs ?? EMPTY_SIGNAL },
    { label: 'Spans', data: props.quotaData?.spans ?? EMPTY_SIGNAL },
    { label: 'Metrics', data: props.quotaData?.metrics ?? EMPTY_SIGNAL },
  ]

  return signals.map(({ label, data }) => {
    const percentage = percentageFor(data)

    return {
      label,
      quota: data.quota,
      usage: data.usage,
      percentage,
      color: colorFor(percentage),
    }
  })
})

const isRefreshDisabled = computed(() => {
  if (props.isLoading)
    return true
  if (!nextRefreshTime.value)
    return false

  return currentTime.value < nextRefreshTime.value
})

const timeUntilRefresh = computed(() => {
  if (!nextRefreshTime.value)
    return ''

  const diff = nextRefreshTime.value.getTime() - currentTime.value.getTime()
  if (diff <= 0)
    return 'Available now'

  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (minutes > 0)
    return `${minutes}m ${seconds}s`

  return `${seconds}s`
})

const timeUntilReset = computed(() => {
  if (!props.quotaData?.quota_reset_at)
    return 'N/A'

  try {
    const resetTime = new Date(props.quotaData.quota_reset_at)

    if (Number.isNaN(resetTime.getTime()))
      return 'N/A'

    const diff = resetTime.getTime() - currentTime.value.getTime()

    if (diff <= 0)
      return 'Resetting soon'

    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    return `${hours}h ${minutes}m ${seconds}s`
  }
  catch {
    return 'N/A'
  }
})

function handleRefresh() {
  emit('refresh', props.projectId)
  const refreshTime = new Date(Date.now() + REFRESH_COOLDOWN_MS)
  nextRefreshTime.value = refreshTime
  saveNextRefreshTimeToStorage(refreshTime)
}

onMounted(() => {
  loadNextRefreshTimeFromStorage()

  intervalId = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (intervalId)
    clearInterval(intervalId)
})
</script>
