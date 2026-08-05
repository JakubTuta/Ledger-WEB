<template>
  <div>
    <div class="text-caption text-medium-emphasis mb-2">
      Traffic shown in this panel. Each panel keeps its own selection; chart and KPI panels
      always count all traffic.
    </div>

    <v-list density="compact">
      <v-list-item
        v-for="category in TRAFFIC_CATEGORIES"
        :key="category"
        :title="categoryLabel(category)"
      >
        <template #prepend>
          <v-checkbox-btn
            :model-value="selected.includes(category)"
            :disabled="isSaving"
            @update:model-value="toggle(category)"
          />
        </template>

        <template #append>
          <v-tooltip
            location="top"
            max-width="240"
          >
            <template #activator="{'props': tooltipProps}">
              <v-icon
                v-bind="tooltipProps"
                :icon="categoryIcon(category)"
                size="small"
                class="text-medium-emphasis"
              />
            </template>

            {{ categoryTooltip(category) }}
          </v-tooltip>
        </template>
      </v-list-item>
    </v-list>

    <div class="d-flex align-center gap-2">
      <v-btn
        size="small"
        variant="text"
        :disabled="selected.length === TRAFFIC_CATEGORIES.length || isSaving"
        @click="selectAll"
      >
        Reset to all traffic
      </v-btn>

      <v-progress-circular
        v-if="isSaving"
        indeterminate
        size="16"
        width="2"
        color="primary"
      />
    </div>

    <div
      v-if="saveError"
      class="text-caption text-error mt-1"
    >
      {{ saveError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Panel } from '~/types/panel'
import type { TrafficCategory } from '~/utils/clientChannel'

const props = defineProps<{
  panel: Panel
}>()

const panelsStore = usePanelsStore()

const isSaving = ref(false)
const saveError = ref('')

const selected = computed(() => panelsStore.getTrafficCategoriesForPanel(props.panel.id))

async function save(categories: TrafficCategory[]) {
  isSaving.value = true
  saveError.value = ''

  const result = await panelsStore.setTrafficCategoriesForPanel(props.panel.id, categories)

  if (!result.success)
    saveError.value = result.error ?? 'Failed to save traffic filter'

  isSaving.value = false
}

async function toggle(category: TrafficCategory) {
  const current = selected.value
  const next = current.includes(category)
    ? current.filter(c => c !== category)
    : [...current, category]

  // Deselecting the last category would leave the panel with nothing to show;
  // an empty selection means "all traffic" everywhere else, so treat it as a
  // reset rather than an empty panel.
  await save(next.length > 0
    ? next
    : [...TRAFFIC_CATEGORIES])
}

async function selectAll() {
  await save([...TRAFFIC_CATEGORIES])
}
</script>
