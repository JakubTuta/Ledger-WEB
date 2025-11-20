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

    <!-- Progress Bar Section -->
    <div class="d-flex flex-column flex-1-1 justify-center">
      <h3 class="text-h5 mb-2">
        {{ projectName }}
      </h3>

      <div class="text-caption text-grey mb-4 font-italic">
        {{ environment }}
      </div>

      <v-progress-linear
        :model-value="usagePercentage"
        :color="progressColor"
        height="32"
        rounded
        class="mb-6"
      >
        <template #default>
          <strong class="text-white">{{ usagePercentage }}%</strong>
        </template>
      </v-progress-linear>

      <!-- Stats Below Progress Bar -->
      <v-row class="mt-4">
        <!-- Left: Logs Count -->
        <v-col
          cols="12"
          md="6"
          class="text-center"
        >
          <div class="text-h5 font-weight-bold">
            {{ currentUsage.toLocaleString() }} / {{ maxQuota.toLocaleString() }}
          </div>

          <div class="text-caption text-grey mt-1">
            logs
          </div>
        </v-col>

        <!-- Right: Quota Reset -->
        <v-col
          cols="12"
          md="6"
          class="text-center"
        >
          <div class="text-h5 font-weight-bold">
            {{ timeUntilReset }}
          </div>

          <div class="text-caption text-grey mt-1">
            until quota reset
          </div>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectQuotaResponse } from '~/types/quota'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  projectId: number
  projectName: string
  environment: string
  quotaData: ProjectQuotaResponse
  isLoading?: boolean
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

const currentUsage = computed(() => props.quotaData?.daily_usage ?? 0)
const maxQuota = computed(() => props.quotaData?.daily_quota ?? 0)

const usagePercentage = computed(() => {
  if (maxQuota.value === 0)
    return 0

  const percentage = Math.round((currentUsage.value / maxQuota.value) * 100)

  return Number.isNaN(percentage)
    ? 0
    : percentage
})

const progressColor = computed(() => {
  const percentage = usagePercentage.value
  if (percentage >= 90)
    return 'error'
  if (percentage >= 75)
    return 'warning'

  return 'success'
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
