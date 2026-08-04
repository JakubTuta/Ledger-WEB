<template>
  <div class="explore-page pa-4">
    <!-- Toolbar -->
    <v-card
      class="mb-3"
      elevation="1"
    >
      <v-card-text class="px-3 py-2">
        <div class="d-flex align-center ga-2 flex-wrap">
          <v-select
            v-model="selectedProjectId"
            label="Project"
            variant="outlined"
            density="compact"
            :items="projectOptions"
            item-title="name"
            item-value="id"
            hide-details
            style="max-width: 220px; min-width: 160px;"
          />

          <v-btn
            variant="outlined"
            density="comfortable"
            prepend-icon="mdi-calendar-clock"
            @click="timeDialogOpen = true"
          >
            {{ timeRangeLabel }}
          </v-btn>

          <v-text-field
            v-model="searchInput"
            density="compact"
            variant="outlined"
            hide-details
            placeholder="Search message, error, method, path..."
            prepend-inner-icon="mdi-magnify"
            clearable
            class="search-field"
          />

          <v-spacer />

          <v-btn
            :color="exploreStore.tailActive
              ? 'error'
              : 'primary'"
            :variant="exploreStore.tailActive
              ? 'flat'
              : 'outlined'"
            :prepend-icon="exploreStore.tailActive
              ? 'mdi-stop'
              : 'mdi-play'"
            density="comfortable"
            @click="exploreStore.toggleTail"
          >
            {{ exploreStore.tailActive
              ? 'Stop tail'
              : 'Live tail' }}
          </v-btn>

          <v-btn
            icon="mdi-refresh"
            variant="text"
            density="comfortable"
            :loading="exploreStore.isLoading"
            title="Refresh"
            @click="exploreStore.refresh()"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Body: facet sidebar + log table -->
    <v-row
      no-gutters
      class="explore-body"
    >
      <!-- Facet sidebar -->
      <v-col
        cols="12"
        md="3"
        lg="2"
        class="pr-md-3 mb-md-0 mb-3"
      >
        <v-card
          elevation="1"
          class="facet-card"
        >
          <v-card-text class="pa-3">
            <div class="d-flex align-center mb-2">
              <span class="text-overline">Filters</span>

              <v-spacer />

              <v-btn
                v-if="hasActiveFacetFilters"
                size="x-small"
                variant="text"
                @click="exploreStore.clearFilters()"
              >
                Clear
              </v-btn>
            </div>

            <div
              v-if="exploreStore.facetsLoading && !exploreStore.facets"
              class="d-flex justify-center pa-4"
            >
              <v-progress-circular
                indeterminate
                color="primary"
                size="24"
              />
            </div>

            <template v-else-if="exploreStore.facets">
              <FacetGroup
                title="Level"
                :values="exploreStore.facets.level"
                :is-active="v => exploreStore.isFacetActive('level', v)"
                @toggle="v => exploreStore.toggleFacet('level', v)"
              />

              <FacetGroup
                title="Type"
                :values="exploreStore.facets.log_type"
                :is-active="v => exploreStore.isFacetActive('log_type', v)"
                @toggle="v => exploreStore.toggleFacet('log_type', v)"
              />

              <FacetGroup
                title="Status"
                :values="exploreStore.facets.status_class"
                :is-active="v => exploreStore.isFacetActive('status_class', v)"
                @toggle="v => exploreStore.toggleFacet('status_class', v)"
              />

              <FacetGroup
                title="Environment"
                :values="exploreStore.facets.environment"
                :is-active="v => exploreStore.isFacetActive('environment', v)"
                @toggle="v => exploreStore.toggleFacet('environment', v)"
              />

              <FacetGroup
                title="Channel"
                :values="channelFacetItems"
                :is-active="isChannelGroupActive"
                :label-for="channelGroupLabel"
                @toggle="toggleChannelGroup"
              />
            </template>

            <div
              v-else
              class="text-caption text-medium-emphasis"
            >
              Select a project to see filters.
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Log table -->
      <v-col
        cols="12"
        md="9"
        lg="10"
      >
        <v-card
          elevation="1"
          class="log-card"
        >
          <!-- Loading -->
          <div
            v-if="exploreStore.isLoading && exploreStore.logs.length === 0"
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
            v-else-if="exploreStore.loadError"
            class="d-flex flex-column align-center justify-center pa-6"
            style="height: 100%;"
          >
            <v-icon
              icon="mdi-alert-circle-outline"
              size="40"
              color="error"
              class="mb-2"
            />

            <div class="text-body-2">
              {{ exploreStore.loadError }}
            </div>

            <v-btn
              class="mt-3"
              size="small"
              variant="outlined"
              @click="exploreStore.refresh()"
            >
              Retry
            </v-btn>
          </div>

          <!-- Empty -->
          <div
            v-else-if="!exploreStore.isLoading && exploreStore.logs.length === 0"
            class="d-flex flex-column align-center text-grey justify-center pa-6"
            style="height: 100%;"
          >
            <v-icon
              icon="mdi-text-box-search-outline"
              size="40"
              class="mb-2"
            />

            <div class="text-body-2">
              No logs match the current filters
            </div>
          </div>

          <!-- Log list -->
          <div
            v-else
            class="explore-log-list"
          >
            <div class="explore-header-row d-flex align-center">
              <div class="status-bar flex-shrink-0" />

              <span class="text-caption font-weight-medium text-medium-emphasis level-col mr-2 flex-shrink-0">Level</span>

              <span class="text-caption font-weight-medium text-medium-emphasis type-col mr-2 flex-shrink-0">Type</span>

              <span class="text-caption font-weight-medium text-medium-emphasis channel-col mr-2 flex-shrink-0 text-center">Channel</span>

              <span class="text-caption font-weight-medium text-medium-emphasis mr-2 flex-grow-1">Message / Path</span>

              <span class="text-caption font-weight-medium text-medium-emphasis status-col mr-3 flex-shrink-0">Status</span>

              <span class="text-caption font-weight-medium text-medium-emphasis duration-col mr-3 flex-shrink-0">Duration</span>

              <span class="text-caption font-weight-medium text-medium-emphasis time-col flex-shrink-0">Time</span>
            </div>

            <div
              v-for="log in exploreStore.logs"
              :key="log.id"
              class="explore-row d-flex align-center cursor-pointer"
              :class="{'explore-row--selected': exploreStore.selectedLog?.id === log.id}"
              @click="exploreStore.openLogDetail(log)"
            >
              <div
                class="status-bar flex-shrink-0"
                :class="levelBarClass(log.level)"
              />

              <v-chip
                :color="levelColor(log.level)"
                size="x-small"
                variant="flat"
                class="level-col font-weight-bold mr-2 flex-shrink-0"
                label
              >
                {{ log.level }}
              </v-chip>

              <span class="type-col text-caption text-medium-emphasis mr-2 flex-shrink-0 text-truncate">
                {{ log.log_type }}
              </span>

              <v-tooltip
                :text="channelLabel(log.client_channel)"
                location="top"
              >
                <template #activator="{'props': tooltipProps}">
                  <span
                    v-bind="tooltipProps"
                    class="channel-col d-flex align-center mr-2 flex-shrink-0 justify-center"
                  >
                    <v-icon
                      :icon="channelIcon(log.client_channel)"
                      size="16"
                      class="text-medium-emphasis"
                    />
                  </span>
                </template>
              </v-tooltip>

              <span class="text-caption text-mono mr-2 flex-grow-1 text-truncate">
                {{ log.path || log.message || log.error_message || '—' }}
              </span>

              <span
                class="text-caption status-col mr-3 flex-shrink-0"
                :class="statusTextClass(log.status_code)"
              >
                {{ log.status_code || '—' }}
              </span>

              <span class="text-caption text-medium-emphasis duration-col mr-3 flex-shrink-0">
                {{ formatDuration(log.duration_ms) }}
              </span>

              <v-tooltip
                :text="formatFullTimestamp(log.timestamp)"
                location="top"
              >
                <template #activator="{'props': tooltipProps}">
                  <span
                    v-bind="tooltipProps"
                    class="text-caption text-medium-emphasis time-col flex-shrink-0"
                  >
                    {{ formatTimestamp(log.timestamp) }}
                  </span>
                </template>
              </v-tooltip>
            </div>

            <!-- Infinite scroll trigger -->
            <div
              v-if="exploreStore.hasMore"
              v-intersect="onIntersect"
              class="d-flex align-center my-4 justify-center"
            >
              <v-progress-circular
                v-if="exploreStore.isLoadingMore"
                indeterminate
                color="primary"
                size="24"
              />

              <span
                v-else
                class="text-caption text-grey"
              >
                Scroll to load more...
              </span>
            </div>

            <div
              v-else
              class="d-flex align-center my-4 justify-center"
            >
              <span class="text-caption text-grey">No more logs to load</span>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Time range dialog (reuses the same picker used on the dashboard) -->
    <TimeOptionsDialog
      v-model="timeDialogOpen"
      :panel="timeRangePanelShim"
      @apply="handleTimeApply"
    />

    <!-- Log detail drawer -->
    <v-navigation-drawer
      :model-value="!!exploreStore.selectedLog"
      location="right"
      temporary
      width="480"
      @update:model-value="(v) => {
        if (!v) exploreStore.closeLogDetail()
      }"
    >
      <template v-if="exploreStore.selectedLog">
        <div class="d-flex align-center border-b pa-3">
          <v-chip
            :color="levelColor(exploreStore.selectedLog.level)"
            size="small"
            variant="flat"
            class="mr-2"
            label
          >
            {{ exploreStore.selectedLog.level }}
          </v-chip>

          <span class="text-body-2 font-weight-medium">{{ exploreStore.selectedLog.log_type }}</span>

          <v-spacer />

          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="exploreStore.closeLogDetail()"
          />
        </div>

        <div class="detail-scroll pa-3">
          <div class="text-caption text-medium-emphasis mb-1">
            {{ formatFullTimestamp(exploreStore.selectedLog.timestamp) }}
          </div>

          <div
            v-if="exploreStore.selectedLog.message"
            class="mb-3"
          >
            <div class="text-caption font-weight-bold mb-1">
              Message
            </div>

            <div class="text-body-2">
              {{ exploreStore.selectedLog.message }}
            </div>
          </div>

          <div
            v-if="exploreStore.selectedLog.path"
            class="mb-3"
          >
            <div class="text-caption font-weight-bold mb-1">
              Request
            </div>

            <code class="text-caption">{{ exploreStore.selectedLog.method }} {{ exploreStore.selectedLog.path }}</code>

            <span
              v-if="exploreStore.selectedLog.status_code"
              class="text-caption ml-2"
              :class="statusTextClass(exploreStore.selectedLog.status_code)"
            >
              {{ exploreStore.selectedLog.status_code }}
            </span>
          </div>

          <div
            v-if="traceIdForSelectedLog"
            class="mb-3"
          >
            <v-btn
              size="small"
              variant="outlined"
              color="info"
              prepend-icon="mdi-link-variant"
              :loading="viewingTrace"
              @click="viewTrace(traceIdForSelectedLog)"
            >
              View trace
            </v-btn>
          </div>

          <div
            v-if="exploreStore.selectedLog.stack_trace"
            class="mb-3"
          >
            <div class="text-caption font-weight-bold mb-1">
              Stack Trace
            </div>

            <pre class="detail-pre text-caption">{{ exploreStore.selectedLog.stack_trace }}</pre>
          </div>

          <div
            v-if="exploreStore.selectedLog.client_channel || callerEntries.length > 0"
            class="mb-3"
          >
            <div class="text-caption font-weight-bold mb-1">
              Caller
            </div>

            <v-table density="compact">
              <tbody>
                <tr v-if="exploreStore.selectedLog.client_channel">
                  <td class="text-caption font-weight-medium py-1 pr-3">
                    channel
                  </td>

                  <td class="text-caption py-1">
                    {{ exploreStore.selectedLog.client_channel }}
                  </td>
                </tr>

                <tr v-if="exploreStore.selectedLog.client_country">
                  <td class="text-caption font-weight-medium py-1 pr-3">
                    country
                  </td>

                  <td class="text-caption py-1">
                    {{ exploreStore.selectedLog.client_country }}
                  </td>
                </tr>

                <tr
                  v-for="[
                    key,
                    value,
                  ] in callerEntries"
                  :key="key"
                >
                  <td class="text-caption font-weight-medium py-1 pr-3">
                    {{ key }}
                  </td>

                  <td class="text-caption py-1">
                    {{ String(value) }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <AttributeList
            :attributes="exploreStore.selectedLog.attributes"
            class="mb-3"
          />

          <div class="d-flex mt-2 flex-wrap gap-2">
            <v-chip
              v-if="exploreStore.selectedLog.client_channel"
              size="x-small"
              variant="outlined"
            >
              <v-icon
                :icon="channelIcon(exploreStore.selectedLog.client_channel)"
                start
              />
              {{ exploreStore.selectedLog.client_channel }}
            </v-chip>

            <v-chip
              v-if="exploreStore.selectedLog.client_country"
              size="x-small"
              variant="outlined"
            >
              <v-icon
                icon="mdi-flag-outline"
                start
              />
              {{ exploreStore.selectedLog.client_country }}
            </v-chip>

            <v-chip
              v-if="exploreStore.selectedLog.environment"
              size="x-small"
              variant="outlined"
            >
              <v-icon
                icon="mdi-earth"
                start
              />
              {{ exploreStore.selectedLog.environment }}
            </v-chip>

            <v-chip
              v-if="exploreStore.selectedLog.release"
              size="x-small"
              variant="outlined"
            >
              <v-icon
                icon="mdi-tag"
                start
              />
              {{ exploreStore.selectedLog.release }}
            </v-chip>

            <v-chip
              v-if="exploreStore.selectedLog.sdk_version"
              size="x-small"
              variant="outlined"
            >
              <v-icon
                icon="mdi-package-variant"
                start
              />
              SDK {{ exploreStore.selectedLog.sdk_version }}
            </v-chip>

            <v-chip
              v-if="exploreStore.selectedLog.platform"
              size="x-small"
              variant="outlined"
            >
              <v-icon
                icon="mdi-monitor"
                start
              />
              {{ exploreStore.selectedLog.platform }}
            </v-chip>
          </div>
        </div>
      </template>
    </v-navigation-drawer>
  </div>
</template>

<script setup lang="ts">
import type { Panel, TimeRangePreset } from '~/types/panel'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Explore',
  robots: 'noindex, nofollow',
})

const exploreStore = useExploreStore()
const projectsStore = useProjectsStore()
const panelsStore = usePanelsStore()
const router = useRouter()
const route = useRoute()

const timeDialogOpen = ref(false)
const viewingTrace = ref(false)

const projectOptions = computed(() => projectsStore.projects.map(p => ({ id: String(p.project_id), name: p.name })),
)

const selectedProjectId = computed({
  get: () => exploreStore.filters.projectId,
  set: (value: string | null) => {
    exploreStore.setProject(value)
    updateUrlParams()
  },
})

const searchInput = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(searchInput, (value) => {
  if (searchDebounce)
    clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    exploreStore.setSearch(value || '')
  }, 300)
})

const hasActiveFacetFilters = computed(() => !!exploreStore.filters.level
  || !!exploreStore.filters.logType
  || !!exploreStore.filters.environment
  || exploreStore.filters.statusClass.length > 0
  || exploreStore.filters.clientChannel.length > 0
  || !!exploreStore.filters.search,
)

// The Channel facet groups raw client_channel values by traffic category
// (browser_navigation + browser_xhr both read as "People") so the sidebar
// doesn't show two chips with the same label. A group's `value` is its raw
// channels joined by comma - isActive/toggle below split it back apart to
// operate on filters.clientChannel, which still stores raw channel values.
const channelFacetItems = computed(() => {
  const raw = exploreStore.facets?.client_channel ?? []
  const grouped = new Map<string, { channels: string[], count: number }>()

  for (const item of raw) {
    const key = categoryOfChannel(item.value) ?? item.value
    const existing = grouped.get(key)
    if (existing) {
      existing.count += item.count
      existing.channels.push(item.value)
    }
    else {
      grouped.set(key, { channels: [item.value], count: item.count })
    }
  }

  return [...grouped.values()].map(group => ({
    value: group.channels.join(','),
    count: group.count,
  }))
})

function channelGroupLabel(value: string): string {
  return channelCategoryLabel(value.split(',')[0])
}

function isChannelGroupActive(value: string): boolean {
  return value.split(',').every(c => exploreStore.filters.clientChannel.includes(c))
}

async function toggleChannelGroup(value: string) {
  const channels = value.split(',')
  const active = isChannelGroupActive(value)
  const current = exploreStore.filters.clientChannel

  exploreStore.filters.clientChannel = active
    ? current.filter(c => !channels.includes(c))
    : [...new Set([...current, ...channels])]

  await exploreStore.refresh()
}

const PRESET_LABELS: Record<TimeRangePreset, string> = {
  today: 'Today',
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  currentWeek: 'Current Week',
  currentMonth: 'Current Month',
  currentYear: 'Current Year',
}

const timeRangeLabel = computed(() => {
  if (exploreStore.filters.period)
    return PRESET_LABELS[exploreStore.filters.period] ?? exploreStore.filters.period
  if (exploreStore.filters.periodFrom && exploreStore.filters.periodTo)
    return `${exploreStore.filters.periodFrom.slice(0, 10)} → ${exploreStore.filters.periodTo.slice(0, 10)}`

  return 'Time Range'
})

// TimeOptionsDialog is built around the dashboard Panel shape (period /
// periodFrom / periodTo). Explore has no Panel entity, so we shim just
// enough of it to drive the picker's initial state.
const timeRangePanelShim = computed(() => ({
  period: exploreStore.filters.period,
  periodFrom: exploreStore.filters.periodFrom,
  periodTo: exploreStore.filters.periodTo,
} as unknown as Panel))

function handleTimeApply(params: { period?: TimeRangePreset, periodFrom?: string, periodTo?: string }) {
  exploreStore.setTimeRange({
    period: params.period ?? null,
    periodFrom: params.periodFrom ?? null,
    periodTo: params.periodTo ?? null,
  })
}

const traceIdForSelectedLog = computed<string | null>(() => {
  const attrs = exploreStore.selectedLog?.attributes
  const traceId = attrs?.trace_id

  return typeof traceId === 'string' && traceId
    ? traceId
    : null
})

// The gateway nests every ledger.client.* attribute except channel/country
// (which are promoted to their own typed columns) under attributes.client -
// see otlp_translator.py's _extract_client_data().
const callerEntries = computed<[string, unknown][]>(() => {
  const client = exploreStore.selectedLog?.attributes?.client

  return client && typeof client === 'object'
    ? Object.entries(client)
    : []
})

// Mirrors TraceListPanelCard's "pin trace" flow: traces don't have their own
// waterfall route in this app — they're viewed as a 'trace' panel pinned to
// the dashboard. Reuse that exact flow so a trace_id found in a log's
// attributes navigates somewhere useful.
async function viewTrace(traceId: string) {
  const projectId = exploreStore.filters.projectId
  if (!projectId)
    return

  viewingTrace.value = true
  try {
    let panel = panelsStore.findTracePanelByTraceId(traceId)

    if (!panel) {
      const result = await panelsStore.createPanel({
        name: `Trace ${traceId.slice(0, 8)}…`,
        type: 'trace',
        project_id: projectId,
        trace_id: traceId,
        index: panelsStore.panels.length,
        period: 'last7days',
      })
      if (result.success && result.panel)
        panel = result.panel
    }

    if (panel) {
      await router.push({ path: '/panel', query: { project: projectId } })
      await nextTick()
      setTimeout(() => {
        document.getElementById(`panel-${panel!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }
  finally {
    viewingTrace.value = false
  }
}

function onIntersect(isIntersecting: boolean) {
  if (isIntersecting)
    exploreStore.loadMore()
}

function updateUrlParams() {
  const query: Record<string, string> = {}
  if (exploreStore.filters.projectId)
    query.project = exploreStore.filters.projectId
  router.replace({ query })
}

// --- Formatting helpers ---
const LEVEL_COLORS: Record<string, string> = {
  debug: 'grey',
  info: 'info',
  warning: 'warning',
  error: 'error',
  critical: 'error',
}

function levelColor(level: string): string {
  return LEVEL_COLORS[level] ?? 'grey'
}

function levelBarClass(level: string): string {
  if (level === 'critical' || level === 'error')
    return 'status-bar--error'
  if (level === 'warning')
    return 'status-bar--warning'
  if (level === 'info')
    return 'status-bar--info'

  return 'status-bar--grey'
}

function statusTextClass(code?: number | null): string {
  if (!code)
    return 'text-medium-emphasis'
  if (code < 300)
    return 'text-success'
  if (code < 500)
    return 'text-warning'

  return 'text-error'
}

function formatDuration(ms?: number | null): string {
  if (ms == null)
    return '—'
  if (ms >= 1000)
    return `${(ms / 1000).toFixed(1)}s`

  return `${ms}ms`
}

const { formatTimestamp, formatFullTimestamp } = useRelativeTime()

function loadFiltersFromUrl() {
  const query = route.query
  if (query.project && typeof query.project === 'string')
    exploreStore.filters.projectId = query.project
}

onMounted(async () => {
  loadFiltersFromUrl()

  await projectsStore.fetchProjects()

  if (!exploreStore.filters.projectId && projectsStore.projects.length > 0)
    exploreStore.filters.projectId = String(projectsStore.projects[0]!.project_id)

  if (exploreStore.filters.projectId) {
    exploreStore.restoreTimeRange()
    await exploreStore.refresh()
  }
})

onUnmounted(() => {
  exploreStore.stopTail()
  if (searchDebounce)
    clearTimeout(searchDebounce)
})
</script>

<style scoped>
.explore-body {
  min-height: calc(100vh - 180px);
}

.facet-card,
.log-card {
  height: calc(100vh - 180px);
  display: flex;
  flex-direction: column;
}

.log-card {
  overflow: hidden;
}

.facet-card :deep(.v-card-text) {
  overflow-y: auto;
  height: 100%;
}

.search-field {
  max-width: 360px;
  flex: 1;
  min-width: 200px;
}

.explore-log-list {
  height: 100%;
  overflow-y: auto;
}

.explore-header-row {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: rgb(var(--v-theme-surface));
  padding: 6px 12px 6px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-height: 32px;
}

.explore-row {
  padding: 6px 12px 6px 0;
  min-height: 36px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.explore-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.explore-row--selected {
  background: rgba(var(--v-theme-primary), 0.08);
}

.status-bar {
  width: 3px;
  align-self: stretch;
  min-height: 36px;
  flex-shrink: 0;
  margin-right: 10px;
}

.status-bar--success { background-color: rgb(var(--v-theme-success)); }
.status-bar--warning { background-color: rgb(var(--v-theme-warning)); }
.status-bar--error   { background-color: rgb(var(--v-theme-error)); }
.status-bar--info     { background-color: rgb(var(--v-theme-info)); }
.status-bar--grey    { background-color: rgba(var(--v-border-color), 0.3); }

.level-col {
  min-width: 68px;
  justify-content: center;
  font-size: 10px;
}

.type-col {
  min-width: 80px;
  max-width: 80px;
}

.channel-col {
  min-width: 24px;
  max-width: 24px;
}

.status-col {
  min-width: 40px;
  text-align: right;
}

.duration-col {
  min-width: 56px;
  text-align: right;
}

.time-col {
  min-width: 64px;
  text-align: right;
}

.text-mono {
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.detail-scroll {
  overflow-y: auto;
  height: calc(100% - 56px);
}

.detail-pre {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 6px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.3;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
