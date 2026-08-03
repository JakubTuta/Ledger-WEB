<template>
  <div>
    <div class="text-caption text-medium-emphasis mb-2">
      Traffic shown in HTTP Request Log, Error List, and the country map. Chart/KPI panels
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

    <v-btn
      size="small"
      variant="text"
      :disabled="selected.length === TRAFFIC_CATEGORIES.length"
      @click="selectAll"
    >
      Reset to all traffic
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import type { TrafficCategory } from '~/utils/clientChannel'

const panelsStore = usePanelsStore()

const selected = computed(() => panelsStore.trafficCategories)

function toggle(category: TrafficCategory) {
  const current = selected.value
  const next = current.includes(category)
    ? current.filter(c => c !== category)
    : [...current, category]
  panelsStore.setTrafficCategories(next)
}

function selectAll() {
  panelsStore.setTrafficCategories([...TRAFFIC_CATEGORIES])
}
</script>
