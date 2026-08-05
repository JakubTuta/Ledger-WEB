<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    :exporting="isExporting"
    icon="mdi-map"
    icon-color="info"
    :traffic-filter-summary="trafficFilterSummary"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @refresh="emit('refresh')"
    @expand="emit('expand')"
    @export-data="format => exportPanel(format, buildExport)"
  >
    <template #options>
      <TrafficCategoryOptions :panel="panel" />
    </template>

    <template #content>
      <!-- Loading -->
      <div
        v-if="loading && countries.length === 0"
        class="d-flex align-center justify-center"
        style="height: 100%;"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="d-flex align-center justify-center pa-4 text-center"
        style="height: 100%;"
      >
        <div>
          <v-icon
            icon="mdi-alert-circle-outline"
            size="40"
            color="error"
            class="mb-2"
          />

          <div class="text-body-2 mb-3">
            {{ error }}
          </div>

          <v-btn
            size="small"
            variant="outlined"
            prepend-icon="mdi-refresh"
            @click="emit('refresh')"
          >
            Retry
          </v-btn>
        </div>
      </div>

      <!--
        Map: always rendered once loaded, whether or not any country has
        requests yet - a country with no requests and one that hasn't
        resolved yet both read as 0, not as an empty/error state.
      -->
      <div
        v-else
        class="d-flex flex-column"
        style="height: 100%;"
      >
        <div class="d-flex align-center ga-1 px-2 pt-1">
          <v-btn
            variant="text"
            size="x-small"
            density="compact"
            :class="{'font-weight-bold': !focusedContinent}"
            @click="focusedContinent = null"
          >
            World
          </v-btn>

          <template v-if="focusedContinent">
            <v-icon
              icon="mdi-chevron-right"
              size="x-small"
              class="text-medium-emphasis"
            />

            <span class="text-caption font-weight-bold">{{ CONTINENT_NAMES[focusedContinent] }}</span>
          </template>
        </div>

        <div style="flex: 1; min-height: 0;">
          <WorldMapChart
            :country-counts="countryCounts"
            :focused-continent="focusedContinent"
            @country-click="handleCountryClick"
          />
        </div>
      </div>
    </template>
  </BasePanelCard>
</template>

<script setup lang="ts">
import type { PanelExportBuildResult } from '~/composables/usePanelExport'
import type { CountryBreakdownEntry, Panel } from '~/types/panel'
import type { Project } from '~/types/project'
import type { ContinentCode } from '~/utils/continents'

const props = defineProps<{
  panel: Panel
  project?: Project
  countries: CountryBreakdownEntry[]
  loading?: boolean
  error?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  refresh: []
  expand: []
}>()

const panelsStore = usePanelsStore()

const { isExporting, exportPanel } = usePanelExport(() => props.panel, () => props.project)

const focusedContinent = ref<ContinentCode | null>(null)

const trafficFilterSummary = computed(() => trafficCategoriesSummary(
  panelsStore.getTrafficCategoriesForPanel(props.panel.id),
))

watch(() => props.panel.id, () => {
  focusedContinent.value = null
})

const countryCounts = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  for (const entry of props.countries)
    map[entry.country] = entry.count

  return map
})

function handleCountryClick(alpha2: string) {
  if (focusedContinent.value)
    return
  const continent = continentForCountry(alpha2)
  if (continent)
    focusedContinent.value = continent
}

function buildExport(): PanelExportBuildResult {
  return {
    rows: props.countries.map(c => ({ country: c.country, count: c.count })),
    extraMeta: { trafficCategories: panelsStore.getTrafficCategoriesForPanel(props.panel.id) },
  }
}
</script>
