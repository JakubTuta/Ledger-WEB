<template>
  <div class="pa-4">
    <!-- Health Strip -->
    <HealthStrip
      class="mb-4"
      :selected-project-id="filters.projectId"
      @project-click="handleHealthProjectClick"
    />

    <!-- Sticky Filters Toolbar -->
    <v-card
      class="filters-toolbar mb-3"
      elevation="1"
    >
      <v-card-text class="px-3 py-2">
        <div class="d-flex align-center ga-2 flex-wrap">
          <TabBar
            v-if="panelsStore.tabs.length > 0"
            :project-id="filters.projectId ?? undefined"
            class="flex-grow-1"
            style="min-width: 0;"
            @template-applied="handlePanelsRefresh"
          />

          <v-spacer v-if="!mobile" />

          <!-- Desktop actions -->
          <template v-if="!mobile">
            <TrafficFilterButton />

            <v-btn
              icon="mdi-keyboard"
              variant="text"
              size="small"
              title="Keyboard shortcuts (?)"
              @click="shortcutsDialog = true"
            />

            <template v-if="!isEditMode">
              <v-btn
                color="primary"
                prepend-icon="mdi-plus"
                size="small"
                :disabled="!filters.projectId"
                @click="newPanelDialog = true"
              >
                Add Panel
              </v-btn>

              <v-btn
                variant="outlined"
                prepend-icon="mdi-pencil"
                size="small"
                @click="enterEditMode"
              >
                Edit Layout
              </v-btn>
            </template>

            <template v-else>
              <v-btn
                variant="outlined"
                size="small"
                @click="cancelEditMode"
              >
                Cancel
              </v-btn>

              <v-btn
                color="primary"
                size="small"
                :loading="isSavingOrder"
                @click="saveOrder"
              >
                Save Order
              </v-btn>
            </template>
          </template>

          <!-- Mobile actions overflow menu -->
          <template v-else>
            <template v-if="isEditMode">
              <v-btn
                variant="outlined"
                size="small"
                @click="cancelEditMode"
              >
                Cancel
              </v-btn>

              <v-btn
                color="primary"
                size="small"
                :loading="isSavingOrder"
                @click="saveOrder"
              >
                Save
              </v-btn>
            </template>

            <template v-else>
              <TrafficFilterButton />

              <v-menu>
                <template #activator="{'props': menuProps}">
                  <v-btn
                    v-bind="menuProps"
                    icon="mdi-dots-vertical"
                    variant="text"
                    size="small"
                  />
                </template>

                <v-list density="compact">
                  <v-list-item
                    prepend-icon="mdi-plus"
                    title="Add Panel"
                    :disabled="!filters.projectId"
                    @click="newPanelDialog = true"
                  />

                  <v-list-item
                    prepend-icon="mdi-pencil"
                    title="Edit Layout"
                    @click="enterEditMode"
                  />

                  <v-list-item
                    prepend-icon="mdi-keyboard"
                    title="Keyboard shortcuts"
                    @click="shortcutsDialog = true"
                  />
                </v-list>
              </v-menu>
            </template>
          </template>
        </div>

        <!-- Column Size Slider (all screen sizes, desktop-only columns) -->
        <div
          v-if="!mobile"
          class="d-flex align-center ga-2 mt-2"
          style="margin-left: auto; width: fit-content;"
        >
          <v-icon
            size="small"
            color="medium-emphasis"
          >
            mdi-view-grid
          </v-icon>

          <v-slider
            v-model="safePanelSizeIndex"
            :min="0"
            :max="3"
            :step="1"
            show-ticks="always"
            tick-size="4"
            hide-details
            style="width: 140px"
          />

          <v-icon
            size="large"
            color="medium-emphasis"
          >
            mdi-view-grid-outline
          </v-icon>
        </div>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <v-row v-if="panelsStore.isLoading && !panelsStore.hasData">
      <v-col
        v-for="n in skeletonCount"
        :key="n"
        cols="12"
        :sm="gridCols >= 6
          ? 12
          : 6"
        :md="gridCols"
      >
        <v-skeleton-loader
          type="card"
          :height="currentSize.height"
        />
      </v-col>
    </v-row>

    <!-- Empty State / Onboarding -->
    <v-row v-else-if="!panelsStore.hasData && !panelsStore.isLoading">
      <v-col
        cols="12"
        md="8"
        offset-md="2"
      >
        <OnboardingGuide
          :selected-project-id="filters.projectId"
          @add-panel="newPanelDialog = true"
        />
      </v-col>
    </v-row>

    <!-- Panels Grid -->
    <v-row
      v-if="panelsStore.hasData && !panelsStore.isLoading"
      :style="panelHeightStyle"
    >
      <Draggable
        v-model="draggablePanels"
        :disabled="!isEditMode"
        item-key="id"
        class="d-flex ma-2 w-100 flex-wrap"
        :animation="200"
        ghost-class="ghost-panel"
        chosen-class="chosen-panel"
        drag-class="drag-panel"
      >
        <template #item="{'element': panel}">
          <v-col
            :id="`panel-${panel.id}`"
            cols="12"
            :sm="gridCols >= 6
              ? 12
              : 6"
            :md="gridCols"
          >
            <PanelRenderer
              :panel="panel"
              :disabled="isEditMode"
              @delete="openDeleteDialog(panel)"
              @time-options="openTimeOptionsDialog(panel)"
              @expand="expandedPanelId = panel.id"
            />
          </v-col>
        </template>
      </Draggable>
    </v-row>

    <!-- Full-page panel overlay -->
    <v-dialog
      :model-value="!!expandedPanel"
      fullscreen
      :scrim="false"
      transition="dialog-bottom-transition"
      @update:model-value="(v) => {
        if (!v) closeExpandedPanel()
      }"
    >
      <v-card
        v-if="expandedPanel"
        class="expanded-panel-card"
      >
        <v-toolbar
          density="compact"
          color="surface"
        >
          <v-toolbar-title>{{ expandedPanel.name }}</v-toolbar-title>

          <v-btn
            icon="mdi-close"
            @click="closeExpandedPanel"
          />
        </v-toolbar>

        <div
          class="expanded-panel-content pa-4"
          :style="{'--panel-card-height': 'calc(100vh - 80px)'}"
        >
          <PanelRenderer
            :panel="expandedPanel"
            @delete="openDeleteDialog(expandedPanel); closeExpandedPanel()"
            @time-options="openTimeOptionsDialog(expandedPanel)"
          />
        </div>
      </v-card>
    </v-dialog>

    <!-- Dialogs -->
    <NewPanelDialog
      v-model="newPanelDialog"
      :initial-project-id="filters.projectId"
      @created="handlePanelCreated"
    />

    <ConfirmDialog
      v-model="deleteDialog.open"
      title="Delete Panel"
      :message="`Are you sure you want to delete the panel '${deleteDialog.panel?.name}'? This action cannot be undone.`"
      confirm-text="Delete"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    />

    <TimeOptionsDialog
      v-model="timeOptionsDialog.open"
      :panel="timeOptionsDialog.panel"
      @apply="handleTimeOptionsApply"
    />

    <ShortcutsHelp v-model="shortcutsDialog" />
  </div>
</template>

<script setup lang="ts">
import type { Panel, TimeRangePreset } from '~/types/panel'
import { useDisplay } from 'vuetify'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Dashboard',
  robots: 'noindex, nofollow',
})

const { mobile } = useDisplay()
const panelsStore = usePanelsStore()
const projectsStore = useProjectsStore()
const healthStore = useHealthStore()
const route = useRoute()
const router = useRouter()

// Filters
const filters = ref<{
  projectId: string | null
}>({
  projectId: null,
})

// Panel size slider
const panelSizeSteps = [
  { cols: 3, height: 360 },
  { cols: 4, height: 440 },
  { cols: 6, height: 540 },
  { cols: 12, height: 680 },
]
const panelSizeIndex = useCookie<number>('panel-size-index', { default: () => 1 })
const safePanelSizeIndex = computed({
  get: () => {
    const i = Number(panelSizeIndex.value)
    if (Number.isNaN(i) || i < 0 || i >= panelSizeSteps.length)
      return 1

    return i
  },
  set: (v: number) => { panelSizeIndex.value = v },
})
const currentSize = computed(() => panelSizeSteps[safePanelSizeIndex.value]!)
const gridCols = computed(() => currentSize.value.cols)
const panelHeightStyle = computed(() => ({ '--panel-card-height': `${currentSize.value.height}px` }))

// Adaptive skeleton count
const skeletonCount = computed(() => {
  const cols = gridCols.value
  if (cols <= 3)
    return 4
  if (cols <= 4)
    return 3

  return 2
})

// Edit Mode
const isEditMode = ref(false)
const isSavingOrder = ref(false)
const editingPanels = ref<Panel[]>([])

// Dialogs
const newPanelDialog = ref(false)
const shortcutsDialog = ref(false)

const deleteDialog = ref<{
  open: boolean
  panel: Panel | null
  loading: boolean
}>({
  open: false,
  panel: null,
  loading: false,
})

const timeOptionsDialog = ref<{
  open: boolean
  panel: Panel | null
}>({
  open: false,
  panel: null,
})

// Computed
const filteredPanels = computed(() => {
  let result = panelsStore.activePanels

  if (filters.value.projectId) {
    result = result.filter(p => p.project_id === filters.value.projectId)
  }

  return result
})

const draggablePanels = computed({
  get: () => (isEditMode.value
    ? editingPanels.value
    : filteredPanels.value),
  set: (newOrder) => {
    if (isEditMode.value)
      editingPanels.value = newOrder
  },
})

// Full-page panel overlay, linkable via ?expand=<panelId> so it's
// bookmarkable and the browser back button closes it.
const expandedPanelId = computed<string | null>({
  get: () => (typeof route.query.expand === 'string'
    ? route.query.expand
    : null),
  set: (panelId) => {
    const query = { ...route.query }
    if (panelId)
      query.expand = panelId
    else
      delete query.expand
    router.push({ query })
  },
})

const expandedPanel = computed(() => panelsStore.panels.find(p => p.id === expandedPanelId.value) ?? null)

function closeExpandedPanel() {
  expandedPanelId.value = null
}

// Methods
function enterEditMode() {
  editingPanels.value = [...filteredPanels.value]
  isEditMode.value = true
}

function cancelEditMode() {
  editingPanels.value = []
  isEditMode.value = false
}

async function saveOrder() {
  isSavingOrder.value = true

  const updates = editingPanels.value.map((panel, index) => ({ id: panel.id, index }))
  const result = await panelsStore.updatePanelIndexes(updates)

  if (result.success) {
    editingPanels.value = []
    isEditMode.value = false
  }

  isSavingOrder.value = false
}

function openDeleteDialog(panel: Panel) {
  deleteDialog.value = { open: true, panel, loading: false }
}

async function confirmDelete() {
  if (!deleteDialog.value.panel)
    return

  deleteDialog.value.loading = true

  const result = await panelsStore.deletePanel(deleteDialog.value.panel.id)

  if (result.success) {
    deleteDialog.value.open = false
    deleteDialog.value.panel = null
  }

  deleteDialog.value.loading = false
}

function handleHealthProjectClick(projectId: string) {
  filters.value.projectId = projectId
}

function openTimeOptionsDialog(panel: Panel) {
  timeOptionsDialog.value = { open: true, panel }
}

async function handleTimeOptionsApply(params: { period?: TimeRangePreset, periodFrom?: string, periodTo?: string }) {
  if (!timeOptionsDialog.value.panel)
    return

  const timeRange = {
    period: params.period || null,
    periodFrom: params.periodFrom || null,
    periodTo: params.periodTo || null,
  }

  await panelsStore.updatePanelTimeRange(timeOptionsDialog.value.panel.id, timeRange)
  timeOptionsDialog.value.open = false
}

async function handlePanelCreated(panel: Panel) {
  if (panel.type === 'error_list') {
    await panelsStore.fetchErrorsForPanel(panel)
  }
  else if (panel.type === 'logs') {
    await panelsStore.fetchLogsForPanel(panel)
  }
  else if (panel.type === 'bottleneck') {
    await panelsStore.fetchBottleneckListForPanel(panel)
  }
  else if (panel.type === 'error_heatmap') {
    await panelsStore.fetchHeatmapForPanel(panel)
  }
  else if (panel.type === 'country_map') {
    await panelsStore.fetchCountryBreakdownForPanel(panel)
  }
  else if (panel.type === 'trace_list' || panel.type === 'trace') {
    // These panels fetch their own data on mount
  }
  else {
    await panelsStore.fetchMetricsForPanel(panel)
  }
}

function fetchAllMetrics() {
  for (const panel of panelsStore.sortedPanels) {
    if (panel.type === 'error_list') {
      panelsStore.fetchErrorsForPanel(panel)
    }
    else if (panel.type === 'logs') {
      panelsStore.fetchLogsForPanel(panel)
    }
    else if (panel.type === 'bottleneck') {
      panelsStore.fetchBottleneckListForPanel(panel)
    }
    else if (panel.type === 'error_heatmap') {
      panelsStore.fetchHeatmapForPanel(panel)
    }
    else if (panel.type === 'country_map') {
      panelsStore.fetchCountryBreakdownForPanel(panel)
    }
    else if (panel.type === 'trace_list' || panel.type === 'trace') {
      // These panels self-manage data fetching
    }
    else {
      panelsStore.fetchMetricsForPanel(panel)
    }
  }
}

async function handlePanelsRefresh() {
  await panelsStore.fetchPanels(true)
  await fetchAllMetrics()
}

// Keyboard shortcuts
useDashboardShortcuts({
  onNewPanel: () => {
    if (filters.value.projectId)
      newPanelDialog.value = true
  },
  onRefresh: () => fetchAllMetrics(),
  onToggleEdit: () => (isEditMode.value
    ? cancelEditMode()
    : enterEditMode()),
  onShowHelp: () => { shortcutsDialog.value = true },
})

watch(() => filters.value.projectId, (projectId) => {
  updateUrlParams()
  if (projectId) {
    const tabs = panelsStore.tabsForProject(projectId)
    if (tabs.length > 0 && !tabs.find(t => t.id === panelsStore.activeTabId)) {
      panelsStore.setActiveTab(tabs[0]!.id)
    }
  }
})
function updateUrlParams() {
  const query: Record<string, string> = {}
  if (filters.value.projectId)
    query.project = filters.value.projectId
  router.replace({ query })
}

function loadFiltersFromUrl() {
  const query = route.query
  if (query.project && typeof query.project === 'string') {
    filters.value.projectId = query.project
  }
}

// Close the overlay if its panel is deleted out from under it - only once
// panels have actually loaded, so a valid deep link isn't closed before
// fetchPanels() resolves.
watch(() => panelsStore.panels, () => {
  if (expandedPanelId.value && panelsStore.hasData && !expandedPanel.value) {
    closeExpandedPanel()
  }
}, { deep: false })

// Lifecycle
onMounted(async () => {
  loadFiltersFromUrl()

  await Promise.all([
    projectsStore.fetchProjects(),
    panelsStore.fetchPanels(),
  ])

  if (!filters.value.projectId && projectsStore.projects.length > 0) {
    filters.value.projectId = String(projectsStore.projects[0]!.project_id)
  }

  await fetchAllMetrics()

  // Migrate legacy single-array panels to first tab, then load server tabs
  panelsStore.migrateToTabs()
  await panelsStore.fetchTabs()

  const projectIds = projectsStore.projects.map(p => String(p.project_id))
  if (projectIds.length > 0) {
    await healthStore.fetchHealthSummary(projectIds, 'today')
    healthStore.startAutoRefresh(projectIds, 'today')
  }
})

onUnmounted(() => {
  healthStore.stopAutoRefresh()
})
</script>

<style scoped>
.ghost-panel {
  opacity: 0.4;
}

.chosen-panel {
  cursor: grabbing !important;
}

.drag-panel {
  opacity: 0.8;
  transform: rotate(2deg);
}

.expanded-panel-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.expanded-panel-content {
  flex: 1;
  min-height: 0;
}
</style>
