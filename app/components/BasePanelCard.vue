<template>
  <v-card
    :class="{'panel-card--disabled': disabled}"
    class="d-flex flex-column panel-card"
  >
    <!-- Header -->
    <v-card-title class="d-flex align-center justify-space-between pa-3">
      <div class="d-flex align-center flex-grow-1 gap-2">
        <v-icon
          :icon="icon"
          :color="iconColor"
          size="small"
        />

        <div
          v-if="!isEditingName"
          class="d-flex align-center cursor-pointer gap-1"
          @click="startEditingName"
        >
          <span class="text-subtitle-1 font-weight-medium">{{ panel.name }}</span>

          <v-icon
            icon="mdi-pencil"
            size="x-small"
            class="text-grey"
          />
        </div>

        <v-text-field
          v-else
          v-model="editedName"
          density="compact"
          variant="outlined"
          hide-details
          autofocus
          :loading="isSavingName"
          class="panel-name-input"
          @blur="saveNameEdit"
          @keydown.enter="saveNameEdit"
          @keydown.esc="cancelNameEdit"
        />
      </div>

      <div class="d-flex align-center gap-1">
        <v-btn
          variant="text"
          size="small"
          :disabled="disabled"
          prepend-icon="mdi-clock-outline"
          @click="emit('timeOptions')"
        >
          {{ timeRangeText }}
        </v-btn>

        <v-btn
          icon="mdi-delete"
          variant="text"
          size="small"
          color="error"
          :disabled="disabled"
          @click="emit('delete')"
        />
      </div>
    </v-card-title>

    <!-- Project Info -->
    <v-card-subtitle class="px-3 pb-2">
      <div class="d-flex align-center gap-2">
        <v-chip
          size="x-small"
          :color="project?.environment === 'production'
            ? 'error'
            : 'primary'"
          variant="tonal"
        >
          {{ project?.environment || 'Unknown' }}
        </v-chip>

        <span class="text-caption ml-1">{{ project?.name || 'Unknown Project' }}</span>

        <span
          v-if="panel.type === 'metrics' && panel.endpoint"
          class="text-caption text-grey ml-1"
        >
          {{ panel.endpoint }}
        </span>
      </div>
    </v-card-subtitle>

    <v-divider />

    <!-- Content Slot -->
    <div class="panel-content-wrapper">
      <slot name="content" />
    </div>

    <!-- Footer Slot (optional) -->
    <template v-if="$slots.footer">
      <v-divider />

      <slot name="footer" />
    </template>
  </v-card>
</template>

<script setup lang="ts">
import type { Panel, TimeRangePreset } from '~/types/panel'
import type { Project } from '~/types/project'

const props = defineProps<{
  panel: Panel
  project?: Project
  disabled?: boolean
  icon: string
  iconColor: string
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
}>()

const panelsStore = usePanelsStore()

const isEditingName = ref(false)
const editedName = ref('')
const isSavingName = ref(false)

const timeRangeText = computed(() => {
  if (props.panel.period) {
    const presetLabels: Record<TimeRangePreset, string> = {
      today: 'Today',
      last7days: 'Last 7 Days',
      last30days: 'Last 30 Days',
      currentWeek: 'Current Week',
      currentMonth: 'Current Month',
      currentYear: 'Current Year',
    }

    return presetLabels[props.panel.period as TimeRangePreset] || 'Select Range'
  }

  if (!props.panel.periodFrom || !props.panel.periodTo)
    return 'Select Range'

  const from = formatDateToDisplay(props.panel.periodFrom)
  const to = formatDateToDisplay(props.panel.periodTo)

  return `${from} - ${to}`
})

function formatDateToDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')

  return `${day}/${month}/${year}`
}

function startEditingName() {
  if (props.disabled)
    return
  editedName.value = props.panel.name
  isEditingName.value = true
}

async function saveNameEdit() {
  if (!editedName.value.trim() || editedName.value === props.panel.name) {
    cancelNameEdit()

    return
  }

  isSavingName.value = true

  const result = await panelsStore.updatePanel(props.panel.id, {
    name: editedName.value.trim(),
  })

  isSavingName.value = false

  if (result.success) {
    isEditingName.value = false
  }
}

function cancelNameEdit() {
  isEditingName.value = false
  editedName.value = ''
}
</script>

<style scoped>
.panel-card {
  height: 450px;
}

.panel-card--disabled {
  opacity: 0.9;
  cursor: move;
  user-select: none;
}

.cursor-pointer {
  cursor: pointer;
}

.panel-name-input {
  max-width: 300px;
}

.panel-content-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Shared content container - flexible height */
:deep(.panel-content-container) {
  height: 100%;
  overflow-y: auto;
}

/* Shared empty state container */
:deep(.panel-empty-state) {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
