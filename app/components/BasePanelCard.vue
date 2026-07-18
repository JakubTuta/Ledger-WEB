<template>
  <v-card
    :class="{'panel-card--disabled': disabled}"
    class="d-flex flex-column panel-card"
  >
    <!-- Row 1: Icon + Name + Actions -->
    <v-card-title class="d-flex align-center justify-space-between pa-3 pb-2">
      <div class="d-flex align-center min-w-0 flex-grow-1 gap-2">
        <v-icon
          :icon="icon"
          :color="iconColor"
          size="x-small"
        />

        <div
          v-if="!isEditingName"
          class="d-flex align-center min-w-0 cursor-pointer gap-1"
          @click="startEditingName"
        >
          <span class="text-subtitle-2 font-weight-medium text-truncate">{{ panel.name }}</span>

          <v-icon
            icon="mdi-pencil"
            size="x-small"
            class="text-grey flex-shrink-0"
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

        <v-chip
          v-if="panel.endpoint && !isEditingName"
          size="x-small"
          variant="tonal"
          class="text-mono flex-shrink-0"
          style="max-width: 180px;"
        >
          <span class="text-truncate">{{ panel.endpoint }}</span>
        </v-chip>
      </div>

      <!-- Desktop: inline actions -->
      <div
        v-if="!mobile"
        class="d-flex align-center flex-shrink-0 gap-1"
      >
        <v-btn
          variant="text"
          size="x-small"
          :disabled="disabled"
          prepend-icon="mdi-clock-outline"
          class="text-caption"
          @click="emit('timeOptions')"
        >
          {{ timeRangeText }}
        </v-btn>

        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="x-small"
          :disabled="disabled"
          @click="emit('refresh')"
        />

        <v-menu>
          <template #activator="{'props': exportMenuProps}">
            <v-btn
              v-bind="exportMenuProps"
              icon="mdi-download"
              variant="text"
              size="x-small"
              :loading="exporting"
              :disabled="disabled || exporting"
            />
          </template>

          <v-list density="compact">
            <v-list-item
              prepend-icon="mdi-code-json"
              title="Export JSON"
              @click="emit('exportData', 'json')"
            />

            <v-list-item
              prepend-icon="mdi-file-delimited-outline"
              title="Export CSV"
              @click="emit('exportData', 'csv')"
            />
          </v-list>
        </v-menu>

        <v-btn
          icon="mdi-delete"
          variant="text"
          size="x-small"
          color="error"
          :disabled="disabled"
          @click="emit('delete')"
        />
      </div>

      <!-- Mobile: overflow menu -->
      <v-menu v-else>
        <template #activator="{'props': menuProps}">
          <v-btn
            v-bind="menuProps"
            icon="mdi-dots-vertical"
            variant="text"
            size="x-small"
            :disabled="disabled"
          />
        </template>

        <v-list density="compact">
          <v-list-item
            prepend-icon="mdi-clock-outline"
            :title="timeRangeText"
            @click="emit('timeOptions')"
          />

          <v-list-item
            prepend-icon="mdi-refresh"
            title="Refresh"
            @click="emit('refresh')"
          />

          <v-list-item
            prepend-icon="mdi-code-json"
            title="Export JSON"
            :disabled="exporting"
            @click="emit('exportData', 'json')"
          />

          <v-list-item
            prepend-icon="mdi-file-delimited-outline"
            title="Export CSV"
            :disabled="exporting"
            @click="emit('exportData', 'csv')"
          />

          <v-list-item
            prepend-icon="mdi-delete"
            title="Delete"
            base-color="error"
            @click="emit('delete')"
          />
        </v-list>
      </v-menu>
    </v-card-title>

    <!-- Row 2: Filters (hidden when slot empty) -->
    <template v-if="$slots.filters">
      <v-divider />

      <div class="px-3 py-2">
        <slot name="filters" />
      </div>
    </template>

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
import type { ExportFormat } from '~/utils/export'
import { useDisplay } from 'vuetify'

const props = defineProps<{
  panel: Panel
  project?: Project
  disabled?: boolean
  exporting?: boolean
  icon: string
  iconColor: string
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  refresh: []
  exportData: [format: ExportFormat]
}>()

const { mobile } = useDisplay()
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
  height: var(--panel-card-height, 500px);
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
  min-width: 0;
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
