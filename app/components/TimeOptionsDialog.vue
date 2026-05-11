<template>
  <v-dialog
    v-model="isOpen"
    max-width="400"
    :fullscreen="$vuetify.display.smAndDown"
  >
    <v-card>
      <v-card-title class="text-h6">
        Time Range Options
      </v-card-title>

      <v-card-text>
        <!-- Preset Buttons -->
        <div class="text-subtitle-2 mb-2">
          Quick Select
        </div>

        <v-chip-group
          v-model="selectedPreset"
          column
          class="mb-4"
        >
          <v-chip
            v-for="option in presetOptions"
            :key="option.value"
            :value="option.value"
            filter
            variant="outlined"
          >
            {{ option.label }}
          </v-chip>
        </v-chip-group>

        <v-divider class="my-4" />

        <!-- Date Range Picker -->
        <div class="text-subtitle-2 mb-2">
          Date Range
        </div>

        <v-date-picker
          v-model="dateRange"
          multiple="range"
          :max="today"
          show-adjacent-months
          class="w-100"
          color="primary"
          @update:model-value="handleDateRangeChange"
        />

        <!-- Validation Error -->
        <v-alert
          v-if="validationError"
          type="error"
          density="compact"
          variant="tonal"
          class="mt-4"
        >
          {{ validationError }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn
          variant="text"
          @click="handleCancel"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          :disabled="!isValid"
          @click="handleApply"
        >
          Apply
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Panel, TimeRangePreset } from '~/types/panel'

const props = defineProps<{
  modelValue: boolean
  panel?: Panel | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'apply': [params: { period?: TimeRangePreset, periodFrom?: string, periodTo?: string }]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const presetOptions: { label: string, value: TimeRangePreset | 'custom' }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'Current Week', value: 'currentWeek' },
  { label: 'Current Month', value: 'currentMonth' },
  { label: 'Current Year', value: 'currentYear' },
  { label: 'Custom Range', value: 'custom' },
]

const selectedPreset = ref<TimeRangePreset | 'custom' | null>(null)
const dateRange = ref<Date[]>([])
const isUpdatingFromPreset = ref(false)

const today = computed(() => new Date())

const sortedDateRange = computed(() => {
  if (dateRange.value.length < 2)
    return []

  return [...dateRange.value].sort((a, b) => a.getTime() - b.getTime())
})

const validationError = computed(() => {
  if (dateRange.value.length === 1) {
    return 'Please select an end date'
  }

  if (dateRange.value.length >= 2) {
    const sorted = sortedDateRange.value
    const fromDate = sorted[0]
    const toDate = sorted[sorted.length - 1]

    if (fromDate && toDate) {
      const daysDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff > 365) {
        return 'Date range cannot exceed 1 year (365 days)'
      }
    }
  }

  return null
})

const isValid = computed(() => {
  return dateRange.value.length >= 2 && !validationError.value
})

watch(selectedPreset, (newValue) => {
  if (newValue && newValue !== 'custom') {
    isUpdatingFromPreset.value = true
    updateDateRangeFromPreset(newValue)
    nextTick(() => {
      isUpdatingFromPreset.value = false
    })
  }
})

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    initializeFromPanel()
  }
})

function initializeFromPanel() {
  if (props.panel?.period) {
    selectedPreset.value = props.panel.period
    isUpdatingFromPreset.value = true
    updateDateRangeFromPreset(props.panel.period)
    nextTick(() => {
      isUpdatingFromPreset.value = false
    })
  }
  else if (props.panel?.periodFrom && props.panel?.periodTo) {
    const fromDate = new Date(props.panel.periodFrom)
    const toDate = new Date(props.panel.periodTo)
    dateRange.value = [fromDate, toDate]

    const matchedPreset = getPresetFromDates(fromDate, toDate)
    selectedPreset.value = matchedPreset || 'custom'
  }
  else {
    selectedPreset.value = 'last7days'
    isUpdatingFromPreset.value = true
    updateDateRangeFromPreset('last7days')
    nextTick(() => {
      isUpdatingFromPreset.value = false
    })
  }
}

function handleDateRangeChange() {
  if (isUpdatingFromPreset.value)
    return

  if (dateRange.value.length >= 2) {
    const fromDate = sortedDateRange.value[0]
    const toDate = sortedDateRange.value[sortedDateRange.value.length - 1]
    if (fromDate && toDate) {
      const matchedPreset = getPresetFromDates(fromDate, toDate)
      selectedPreset.value = matchedPreset || 'custom'
    }
  }
}

function updateDateRangeFromPreset(preset: TimeRangePreset) {
  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let from: Date

  switch (preset) {
    case 'today':
      from = new Date(todayDate)
      break
    case 'last7days':
      from = new Date(todayDate)
      from.setDate(from.getDate() - 6)
      break
    case 'last30days':
      from = new Date(todayDate)
      from.setDate(from.getDate() - 29)
      break
    case 'currentWeek':
      from = new Date(todayDate)
      from.setDate(from.getDate() - from.getDay())
      break
    case 'currentMonth':
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'currentYear':
      from = new Date(now.getFullYear(), 0, 1)
      break
    default:
      from = new Date(todayDate)
      from.setDate(from.getDate() - 6)
  }

  dateRange.value = [from, todayDate]
}

function getPresetFromDates(from: Date, to: Date): TimeRangePreset | null {
  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (to.toDateString() !== todayDate.toDateString())
    return null

  if (from.toDateString() === todayDate.toDateString())
    return 'today'

  const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 6)
    return 'last7days'
  if (diffDays === 29)
    return 'last30days'

  const weekStart = new Date(todayDate)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  if (from.toDateString() === weekStart.toDateString())
    return 'currentWeek'

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  if (from.toDateString() === monthStart.toDateString())
    return 'currentMonth'

  const yearStart = new Date(now.getFullYear(), 0, 1)
  if (from.toDateString() === yearStart.toDateString())
    return 'currentYear'

  return null
}

function formatDateToString(date: Date): string {
  return date.toISOString().split('T')[0]!
}

function handleCancel() {
  isOpen.value = false
}

function handleApply() {
  if (!isValid.value)
    return

  const fromDate = sortedDateRange.value[0]
  const toDate = sortedDateRange.value[sortedDateRange.value.length - 1]

  if (!fromDate || !toDate)
    return

  if (selectedPreset.value && selectedPreset.value !== 'custom') {
    emit('apply', {
      period: selectedPreset.value,
    })
  }
  else {
    emit('apply', {
      periodFrom: formatDateToString(fromDate),
      periodTo: formatDateToString(toDate),
    })
  }

  isOpen.value = false
}
</script>
