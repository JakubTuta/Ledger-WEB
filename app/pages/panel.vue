<template>
  <v-container
    fluid
    class="pa-6"
  >
    <!-- Filters Section -->
    <v-card class="mb-4">
      <v-card-text
        class="align-center"
        flex
      >
        <v-select
          v-model="filters.projectId"
          label="Project"
          variant="outlined"
          density="compact"
          :items="projectOptions"
          item-title="name"
          item-value="id"
          clearable
          hide-details
          max-width="250px"
          class="mx-2"
        >
          <template #item="{'props': itemProps, item}">
            <v-list-item
              v-bind="itemProps"
              :subtitle="item.raw.environment"
            />
          </template>
        </v-select>

        <v-select
          v-model="filters.panelType"
          label="Panel Type"
          variant="outlined"
          density="compact"
          :items="panelTypeOptions"
          item-title="label"
          item-value="value"
          clearable
          hide-details
          max-width="250px"
          class="mx-2"
        />

        <v-spacer />

        <div v-if="!isEditMode">
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            class="mx-2"
            @click="newPanelDialog = true"
          >
            Add Panel
          </v-btn>

          <v-btn
            variant="outlined"
            prepend-icon="mdi-pencil"
            class="mx-2"
            @click="enterEditMode"
          >
            Edit Layout
          </v-btn>
        </div>

        <div v-else>
          <v-btn
            variant="outlined"
            class="mx-2"
            @click="cancelEditMode"
          >
            Cancel
          </v-btn>

          <v-btn
            color="primary"
            :loading="isSavingOrder"
            class="mx-2"
            @click="saveOrder"
          >
            Save Order
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <v-row v-if="panelsStore.isLoading && !panelsStore.hasData">
      <v-col
        v-for="n in 3"
        :key="n"
        cols="12"
        md="6"
        lg="4"
      >
        <v-skeleton-loader
          type="card"
          :height="300"
        />
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else-if="!panelsStore.hasData && !panelsStore.isLoading">
      <v-col cols="12">
        <v-alert
          type="info"
          variant="flat"
          class="mb-4"
        >
          <div class="text-h6 mb-2">
            No panels yet
          </div>

          <div class="text-body-2">
            Create your first panel to start monitoring your logs and metrics.
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Panels Grid -->
    <v-row v-if="panelsStore.hasData && !panelsStore.isLoading">
      <Draggable
        v-model="draggablePanels"
        :disabled="!isEditMode"
        item-key="id"
        class="d-flex w-100 flex-wrap"
        :animation="200"
        ghost-class="ghost-panel"
        chosen-class="chosen-panel"
        drag-class="drag-panel"
      >
        <template #item="{'element': panel}">
          <v-col
            cols="12"
            lg="6"
          >
            <ListPanelCard
              v-if="panel.type === 'error_list'"
              :panel="panel"
              :project="getProjectForPanel(panel)"
              :items="panelsStore.getErrorsForPanel(panel.id)"
              :loading="panelsStore.isErrorsLoading(panel.id)"
              :has-more="panelsStore.getErrorsHasMore(panel.id)"
              :offset="panelsStore.getErrorsOffset(panel.id)"
              :disabled="isEditMode"
              type="errors"
              @delete="openDeleteDialog(panel)"
              @time-options="openTimeOptionsDialog(panel)"
              @refresh="() => panelsStore.fetchErrorsForPanel(panel)"
              @load-page="(offset) => panelsStore.fetchErrorsForPanel(panel, offset)"
            />

            <ListPanelCard
              v-else-if="panel.type === 'logs'"
              :panel="panel"
              :project="getProjectForPanel(panel)"
              :items="panelsStore.getLogsForPanel(panel.id)"
              :loading="panelsStore.isLogsLoading(panel.id)"
              :has-more="panelsStore.getLogsHasMore(panel.id)"
              :offset="panelsStore.getLogsOffset(panel.id)"
              :disabled="isEditMode"
              type="logs"
              @delete="openDeleteDialog(panel)"
              @time-options="openTimeOptionsDialog(panel)"
              @refresh="() => panelsStore.fetchLogsForPanel(panel)"
              @load-page="(offset) => panelsStore.fetchLogsForPanel(panel, offset)"
            />

            <PanelCard
              v-else
              :panel="panel"
              :project="getProjectForPanel(panel)"
              :metrics="panelsStore.getMetricsForPanel(panel.id)"
              :loading="panelsStore.isMetricsLoading(panel.id)"
              :disabled="isEditMode"
              @delete="openDeleteDialog(panel)"
              @time-options="openTimeOptionsDialog(panel)"
              @refresh="() => panelsStore.fetchMetricsForPanel(panel)"
            />
          </v-col>
        </template>
      </Draggable>
    </v-row>

    <!-- Dialogs -->
    <NewPanelDialog
      v-model="newPanelDialog"
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
  </v-container>
</template>

<script setup lang="ts">
import type { Panel, PanelType, TimeRangePreset } from '~/types/panel'
import type { Project } from '~/types/project'

definePageMeta({
  middleware: 'auth',
})

const panelsStore = usePanelsStore()
const projectsStore = useProjectsStore()
const route = useRoute()
const router = useRouter()

// Filters
const filters = ref<{
  projectId: string | null
  panelType: PanelType | null
}>({
  projectId: null,
  panelType: null,
})

const panelTypeOptions = [
  { label: 'Logs', value: 'logs' },
  { label: 'Errors', value: 'errors' },
  { label: 'Metrics', value: 'metrics' },
  { label: 'Error List', value: 'error_list' },
]

const projectOptions = computed(() => projectsStore.projects.map(p => ({
  id: String(p.project_id),
  name: p.name,
  environment: p.environment,
})))

// Edit Mode
const isEditMode = ref(false)
const isSavingOrder = ref(false)
const editingPanels = ref<Panel[]>([])

// Dialogs
const newPanelDialog = ref(false)

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
  let result = panelsStore.sortedPanels

  if (filters.value.projectId) {
    result = result.filter(p => p.project_id === filters.value.projectId)
  }

  if (filters.value.panelType) {
    result = result.filter(p => p.type === filters.value.panelType)
  }

  return result
})

const draggablePanels = computed({
  get: () => (isEditMode.value
    ? editingPanels.value
    : filteredPanels.value),
  set: (newOrder) => {
    if (isEditMode.value) {
      editingPanels.value = newOrder
    }
  },
})

// Methods
function getProjectForPanel(panel: Panel): Project | undefined {
  return projectsStore.projects.find(p => String(p.project_id) === panel.project_id)
}

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

  const updates = editingPanels.value.map((panel, index) => ({
    id: panel.id,
    index,
  }))

  const result = await panelsStore.updatePanelIndexes(updates)

  if (result.success) {
    editingPanels.value = []
    isEditMode.value = false
  }

  isSavingOrder.value = false
}

function openDeleteDialog(panel: Panel) {
  deleteDialog.value = {
    open: true,
    panel,
    loading: false,
  }
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

function openTimeOptionsDialog(panel: Panel) {
  timeOptionsDialog.value = {
    open: true,
    panel,
  }
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
    else {
      panelsStore.fetchMetricsForPanel(panel)
    }
  }
}

watch(() => filters.value.projectId, () => {
  updateUrlParams()
})

watch(() => filters.value.panelType, () => {
  updateUrlParams()
})

function updateUrlParams() {
  const query: Record<string, string> = {}

  if (filters.value.projectId) {
    query.project = filters.value.projectId
  }

  if (filters.value.panelType) {
    query.type = filters.value.panelType
  }

  router.replace({ query })
}

function loadFiltersFromUrl() {
  const query = route.query

  if (query.project && typeof query.project === 'string') {
    filters.value.projectId = query.project
  }

  if (query.type && typeof query.type === 'string' && ['logs', 'errors', 'metrics', 'error_list'].includes(query.type)) {
    filters.value.panelType = query.type as PanelType
  }
}

// Lifecycle
onMounted(async () => {
  loadFiltersFromUrl()

  await Promise.all([
    projectsStore.fetchProjects(),
    panelsStore.fetchPanels(),
  ])

  await fetchAllMetrics()
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
</style>
