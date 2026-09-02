<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    :exporting="isExporting"
    :icon="icon"
    :icon-color="iconColor"
    :traffic-filter-hint="type === 'bottleneck'"
    :traffic-filter-summary="trafficFilterSummary"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @refresh="emit('refresh')"
    @expand="emit('expand')"
    @export-data="format => exportPanel(format, buildExport)"
  >
    <!-- Filter row: text search only, everything else lives in the options menu -->
    <template
      v-if="type === 'logs' || type === 'error_list' || type === 'bottleneck'"
      #filters
    >
      <div class="d-flex align-center">
        <v-text-field
          v-model="searchFilter"
          density="compact"
          variant="outlined"
          hide-details
          :placeholder="searchPlaceholder"
          prepend-inner-icon="mdi-magnify"
          clearable
          class="search-input"
        />
      </div>
    </template>

    <template
      v-if="type === 'logs' || type === 'error_list'"
      #options
    >
      <div
        v-if="type === 'logs'"
        class="mb-3"
      >
        <div class="text-caption text-medium-emphasis mb-2">
          Status code
        </div>

        <v-btn-toggle
          v-model="statusClassFilter"
          density="compact"
          variant="outlined"
          divided
          mandatory
        >
          <v-btn
            value="all"
            size="small"
          >
            All
          </v-btn>

          <v-btn
            value="2xx"
            size="small"
            color="success"
          >
            2xx
          </v-btn>

          <v-btn
            value="4xx"
            size="small"
            color="warning"
          >
            4xx
          </v-btn>

          <v-btn
            value="5xx"
            size="small"
            color="error"
          >
            5xx
          </v-btn>
        </v-btn-toggle>
      </div>

      <TrafficCategoryOptions :panel="panel" />
    </template>

    <template #content>
      <v-card-text class="panel-content-container pa-0">
        <!-- Loading State -->
        <div
          v-if="loading && (!items || items.length === 0)"
          class="d-flex align-center justify-center"
          style="height: 100%;"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>

        <!--
          Fetch failed: kept ahead of the empty state so a server error
          isn't reported to the user as "no data for this window".
        -->
        <v-alert
          v-else-if="error && (!items || items.length === 0)"
          type="error"
          variant="tonal"
          density="compact"
          class="ma-3"
        >
          {{ error }}

          <template #append>
            <v-btn
              size="small"
              variant="text"
              :loading="loading"
              @click="emit('refresh')"
            >
              Retry
            </v-btn>
          </template>
        </v-alert>

        <!-- No Data State -->
        <div
          v-else-if="!items || items.length === 0"
          class="text-grey d-flex align-center justify-center"
          style="height: 100%;"
        >
          <div class="text-center">
            <v-icon
              :icon="emptyIcon"
              size="48"
              class="mb-2"
            />

            <div class="text-body-2">
              {{ emptyMessage }}
            </div>
          </div>
        </div>

        <!-- List -->
        <div
          v-else
          class="log-list"
        >
          <!-- Column headers -->
          <div class="log-header-row d-flex align-center">
            <div class="status-bar flex-shrink-0" />

            <template v-if="type === 'logs'">
              <span class="text-caption font-weight-medium text-medium-emphasis method-chip mr-2 flex-shrink-0">Method</span>

              <span class="text-caption font-weight-medium text-medium-emphasis log-path mr-2 flex-grow-1">Path</span>

              <span
                class="text-caption font-weight-medium text-medium-emphasis mr-3 flex-shrink-0"
                style="min-width: 30px; text-align: right;"
              >Status</span>

              <span class="text-caption font-weight-medium text-medium-emphasis duration-col mr-3 flex-shrink-0">Duration</span>

              <span class="text-caption font-weight-medium text-medium-emphasis time-col flex-shrink-0">Time</span>
            </template>

            <template v-else-if="type === 'bottleneck'">
              <span class="text-caption font-weight-medium text-medium-emphasis method-chip mr-2 flex-shrink-0">Method</span>

              <span class="text-caption font-weight-medium text-medium-emphasis log-path mr-2 flex-grow-1">Route</span>

              <button
                v-for="col in bottleneckColumns"
                :key="col.stat"
                type="button"
                class="sort-col-header text-caption font-weight-medium flex-shrink-0"
                :class="bottleneckStatisticFilter === col.stat
                  ? 'active-sort-col'
                  : 'text-medium-emphasis'"
                @click.stop="setBottleneckSort(col.stat)"
              >
                {{ col.label }}
                <v-icon
                  v-if="bottleneckStatisticFilter === col.stat"
                  size="10"
                  class="ml-1"
                >
                  {{ bottleneckSortFilter === 'desc'
                    ? 'mdi-arrow-down'
                    : 'mdi-arrow-up' }}
                </v-icon>
              </button>
            </template>

            <template v-else>
              <span class="text-caption font-weight-medium text-medium-emphasis method-chip mr-2 flex-shrink-0">Type</span>

              <span class="text-caption font-weight-medium text-medium-emphasis log-path mr-2 flex-grow-1">Message / Path</span>

              <span
                class="text-caption font-weight-medium text-medium-emphasis mr-3 flex-shrink-0"
                style="min-width: 30px; text-align: right;"
              >Count</span>

              <span class="text-caption font-weight-medium text-medium-emphasis time-col flex-shrink-0">Last seen</span>
            </template>
          </div>

          <!-- Logs: compact HTTP request rows -->
          <template v-if="type === 'logs'">
            <div
              v-for="item in items"
              :key="item.log_id"
              class="log-row"
            >
              <!-- Collapsed row -->
              <div
                class="log-row-header d-flex align-center cursor-pointer"
                @click="toggleExpanded(item)"
              >
                <!-- Status bar -->
                <div
                  class="status-bar flex-shrink-0"
                  :class="getStatusBarClass(item)"
                />

                <!-- Method chip -->
                <v-chip
                  :color="getMethodColor(item.method)"
                  size="x-small"
                  variant="flat"
                  class="method-chip font-weight-bold mr-2 flex-shrink-0"
                  label
                >
                  {{ item.method || '?' }}
                </v-chip>

                <!-- Path -->
                <span class="log-path text-caption text-mono mr-2 flex-grow-1 text-truncate">
                  {{ item.path || item.message || '—' }}
                </span>

                <!-- Status code -->
                <span
                  class="text-caption font-weight-medium mr-3 flex-shrink-0"
                  :class="getStatusTextClass(item)"
                >
                  {{ item.status_code || '—' }}
                </span>

                <!-- Duration -->
                <span class="text-caption text-medium-emphasis duration-col mr-3 flex-shrink-0">
                  {{ formatDuration(item.duration_ms) }}
                </span>

                <!-- Relative time -->
                <v-tooltip
                  :text="formatFullTimestamp(item.timestamp)"
                  location="top"
                >
                  <template #activator="{'props': tooltipProps}">
                    <span
                      v-bind="tooltipProps"
                      class="text-caption text-medium-emphasis time-col flex-shrink-0"
                    >
                      {{ formatTimestamp(item.timestamp) }}
                    </span>
                  </template>
                </v-tooltip>
              </div>

              <!-- Expanded details -->
              <v-expand-transition>
                <div
                  v-if="item.expanded"
                  class="log-row-detail pa-3"
                >
                  <div class="d-flex mb-2 flex-wrap gap-2">
                    <v-chip
                      v-if="item.method"
                      size="x-small"
                      :color="getMethodColor(item.method)"
                      variant="flat"
                      label
                    >
                      {{ item.method }}
                    </v-chip>

                    <v-chip
                      v-if="item.status_code"
                      size="x-small"
                      :color="getStatusChipColor(item)"
                      variant="flat"
                    >
                      {{ item.status_code }}
                    </v-chip>

                    <v-chip
                      v-if="item.duration_ms !== null && item.duration_ms !== undefined"
                      size="x-small"
                      variant="outlined"
                    >
                      {{ formatDuration(item.duration_ms) }}
                    </v-chip>

                    <v-chip
                      v-if="item.trace_id"
                      size="x-small"
                      variant="flat"
                      color="info"
                      prepend-icon="mdi-link-variant"
                    >
                      trace
                    </v-chip>
                  </div>

                  <div
                    v-if="item.path"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Path:
                    </div>

                    <code class="text-caption">{{ item.path }}</code>
                  </div>

                  <div
                    v-if="item.attributes?.endpoint?.query_params"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Query:
                    </div>

                    <code class="text-caption">{{ item.attributes.endpoint.query_params }}</code>
                  </div>

                  <div
                    v-if="item.attributes?.endpoint?.response_body"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Response Body:
                    </div>

                    <pre class="detail-pre text-caption">{{ item.attributes.endpoint.response_body }}</pre>
                  </div>

                  <div
                    v-if="item.stack_trace"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Stack Trace:
                    </div>

                    <pre class="detail-pre text-caption">{{ item.stack_trace }}</pre>
                  </div>

                  <AttributeList
                    :attributes="item.attributes"
                    class="mb-2"
                  />

                  <div class="d-flex mt-2 flex-wrap gap-2">
                    <v-chip
                      v-if="item.environment"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        icon="mdi-earth"
                        start
                      />
                      {{ item.environment }}
                    </v-chip>

                    <v-chip
                      v-if="item.release"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        icon="mdi-tag"
                        start
                      />
                      {{ item.release }}
                    </v-chip>

                    <v-chip
                      v-if="item.sdk_version"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        icon="mdi-package-variant"
                        start
                      />
                      SDK {{ item.sdk_version }}
                    </v-chip>

                    <v-chip
                      v-if="item.platform"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        icon="mdi-monitor"
                        start
                      />
                      {{ item.platform }}
                    </v-chip>

                    <v-chip
                      v-if="item.client_channel"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        :icon="channelIcon(item.client_channel)"
                        start
                      />
                      {{ item.client_channel }}
                    </v-chip>

                    <v-chip
                      v-if="item.client_country"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        icon="mdi-flag-outline"
                        start
                      />
                      {{ item.client_country }}
                    </v-chip>
                  </div>
                </div>
              </v-expand-transition>
            </div>
          </template>

          <!-- Bottleneck: per-route ranked rows -->
          <template v-else-if="type === 'bottleneck'">
            <div
              v-for="item in items"
              :key="item.route"
              class="log-row"
            >
              <!-- Collapsed row -->
              <div
                class="log-row-header d-flex align-center cursor-pointer"
                @click="toggleExpanded(item)"
              >
                <!-- Status bar: colour by active stat relative to max -->
                <div
                  class="status-bar flex-shrink-0"
                  :class="getValueBarClass(item.value, maxValue)"
                />

                <!-- Method chip -->
                <v-chip
                  :color="getMethodColor(parseRoute(item.route).method)"
                  size="x-small"
                  variant="flat"
                  class="method-chip font-weight-bold mr-2 flex-shrink-0"
                  label
                >
                  {{ parseRoute(item.route).method || '?' }}
                </v-chip>

                <!-- Path -->
                <span class="log-path text-caption text-mono mr-2 flex-grow-1 text-truncate">
                  {{ parseRoute(item.route).path }}
                </span>

                <!-- Count -->
                <span
                  class="sort-col-value text-caption flex-shrink-0"
                  :class="{'active-col-value': bottleneckStatisticFilter === 'count'}"
                >
                  {{ formatCount(item.request_count ?? 0) }}
                </span>

                <!-- Avg -->
                <span
                  class="sort-col-value text-caption flex-shrink-0"
                  :class="{'active-col-value': bottleneckStatisticFilter === 'avg'}"
                >
                  {{ formatValue(item.avg_value) }}
                </span>

                <!-- Min -->
                <span
                  class="sort-col-value text-caption flex-shrink-0"
                  :class="{'active-col-value': bottleneckStatisticFilter === 'min'}"
                >
                  {{ formatValue(item.min_value) }}
                </span>

                <!-- Max -->
                <span
                  class="sort-col-value text-caption flex-shrink-0"
                  :class="{'active-col-value': bottleneckStatisticFilter === 'max'}"
                >
                  {{ formatValue(item.max_value_route) }}
                </span>

                <!-- Median -->
                <span
                  class="sort-col-value text-caption flex-shrink-0"
                  :class="{'active-col-value': bottleneckStatisticFilter === 'median'}"
                >
                  {{ formatValue(item.median_value) }}
                </span>
              </div>

              <!-- Progress bar driven by active statistic -->
              <v-progress-linear
                :model-value="maxValue > 0
                  ? (item.value ?? 0) / maxValue * 100
                  : 0"
                :color="getValueBarColor(item.value, maxValue)"
                height="2"
                bg-opacity="0.08"
                rounded
                class="mx-0"
              />

              <!-- Expanded: full route -->
              <v-expand-transition>
                <div
                  v-if="item.expanded"
                  class="log-row-detail pa-3"
                >
                  <div class="text-caption text-mono text-medium-emphasis">
                    {{ item.route }}
                  </div>
                </div>
              </v-expand-transition>
            </div>
          </template>

          <!-- Errors: compact grouped rows -->
          <template v-else>
            <div
              v-for="item in items"
              :key="item.log_id"
              class="log-row"
            >
              <!-- Collapsed row -->
              <div
                class="log-row-header d-flex align-center cursor-pointer"
                @click="toggleExpanded(item)"
              >
                <!-- Status bar: red for 5xx or no status, amber for 4xx -->
                <div
                  class="status-bar flex-shrink-0"
                  :class="getErrorStatusBarClass(item)"
                />

                <!-- Status code chip or error type -->
                <v-chip
                  v-if="item.status_code"
                  :color="getStatusChipColor(item)"
                  size="x-small"
                  variant="flat"
                  class="method-chip font-weight-bold mr-2 flex-shrink-0"
                  label
                >
                  {{ item.status_code }}
                </v-chip>

                <v-chip
                  v-else
                  color="error"
                  size="x-small"
                  variant="flat"
                  class="method-chip font-weight-bold mr-2 flex-shrink-0"
                  label
                >
                  {{ item.error_type || 'error' }}
                </v-chip>

                <!-- Path or message -->
                <span class="log-path text-caption text-mono mr-2 flex-grow-1 text-truncate">
                  {{ item.path || item.message || '—' }}
                </span>

                <!-- Occurrence count -->
                <v-chip
                  :color="(item.occurrence_count || 1) > 1
                    ? 'error'
                    : 'default'"
                  :variant="(item.occurrence_count || 1) > 1
                    ? 'tonal'
                    : 'text'"
                  size="x-small"
                  class="mr-3 flex-shrink-0"
                >
                  ×{{ item.occurrence_count || 1 }}
                </v-chip>

                <!-- Last seen -->
                <v-tooltip
                  :text="formatFullTimestamp(item.last_seen || item.timestamp)"
                  location="top"
                >
                  <template #activator="{'props': tooltipProps}">
                    <span
                      v-bind="tooltipProps"
                      class="text-caption text-medium-emphasis time-col flex-shrink-0"
                    >
                      {{ formatTimestamp(item.last_seen || item.timestamp) }}
                    </span>
                  </template>
                </v-tooltip>
              </div>

              <!-- Expanded details -->
              <v-expand-transition>
                <div
                  v-if="item.expanded"
                  class="log-row-detail pa-3"
                >
                  <!-- Occurrence range -->
                  <div
                    v-if="item.first_seen"
                    class="d-flex align-center mb-2 gap-2"
                  >
                    <v-chip
                      size="x-small"
                      variant="outlined"
                    >
                      ×{{ item.occurrence_count || 1 }} occurrences
                    </v-chip>

                    <span class="text-caption text-medium-emphasis">
                      {{ formatTimestamp(item.first_seen) }} → {{ formatTimestamp(item.last_seen || item.timestamp) }}
                    </span>
                  </div>

                  <div class="mb-2">
                    <div class="text-caption font-weight-bold mb-1">
                      Message:
                    </div>

                    <div class="text-caption">
                      {{ item.message }}
                    </div>
                  </div>

                  <div
                    v-if="item.stack_trace"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Stack Trace:
                    </div>

                    <pre class="detail-pre text-caption">{{ item.stack_trace }}</pre>
                  </div>

                  <div
                    v-else-if="item.attributes?.stack_trace"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Stack Trace:
                    </div>

                    <pre class="detail-pre text-caption">{{ item.attributes.stack_trace }}</pre>
                  </div>

                  <AttributeList :attributes="item.attributes" />
                </div>
              </v-expand-transition>
            </div>
          </template>

          <!-- Load More Trigger -->
          <div
            v-if="hasMore"
            v-intersect="onIntersect"
            class="d-flex align-center my-4 justify-center"
          >
            <v-progress-circular
              v-if="loading"
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
            v-else-if="items.length > 0"
            class="d-flex align-center my-4 justify-center"
          >
            <span class="text-caption text-grey">
              No more {{ type }} to load
            </span>
          </div>
        </div>
      </v-card-text>
    </template>
  </BasePanelCard>

  <v-snackbar
    v-model="showExportError"
    timeout="3000"
    color="error"
    location="bottom right"
  >
    {{ exportError }}
  </v-snackbar>
</template>

<script setup lang="ts">
import type { PanelExportBuildResult } from '~/composables/usePanelExport'
import type { NotificationLevel } from '~/types/notifications'
import type { BottleneckStatistic, Panel } from '~/types/panel'
import type { Project } from '~/types/project'
import { omitUiFields } from '~/utils/export'

const props = withDefaults(defineProps<{
  panel: Panel
  project?: Project
  items?: ListItem[]
  loading?: boolean
  error?: string | null
  disabled?: boolean
  hasMore?: boolean
  offset?: number
  maxValue?: number
  type: 'errors' | 'logs' | 'error_list' | 'bottleneck'
}>(), {
  maxValue: 0,
})

const emit = defineEmits<{
  delete: []
  timeOptions: []
  refresh: []
  expand: []
  loadPage: [offset: number]
  filterChange: []
}>()

const panelsStore = usePanelsStore()

const { isExporting, exportError, exportPanel } = usePanelExport(() => props.panel, () => props.project)

const showExportError = computed({
  get: () => !!exportError.value,
  set: (v: boolean) => {
    if (!v)
      exportError.value = ''
  },
})

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'
type LogType = 'console' | 'logger' | 'exception' | 'network' | 'database' | 'endpoint' | 'custom'

interface ListItem {
  log_id?: number
  project_id?: number
  level?: NotificationLevel | LogLevel
  log_type?: string | LogType
  message?: string
  timestamp?: string
  error_type?: string
  error_message?: string
  error_fingerprint?: string
  stack_trace?: string
  attributes?: Record<string, any>
  environment?: string
  release?: string
  sdk_version?: string
  platform?: string
  client_channel?: string
  client_country?: string
  trace_id?: string
  expanded?: boolean
  isNew?: boolean
  // HTTP fields
  method?: string
  path?: string
  status_code?: number
  duration_ms?: number
  // Grouped error fields
  group_key?: string
  occurrence_count?: number
  first_seen?: string
  last_seen?: string
  // Bottleneck fields
  route?: string
  value?: number
  request_count?: number
  min_value?: number | null
  max_value?: number | null
  max_value_route?: number | null
  avg_value?: number | null
  median_value?: number | null
}

const { formatTimestamp, formatFullTimestamp } = useRelativeTime()

const trafficFilterSummary = computed(() => ((props.type === 'logs' || props.type === 'error_list')
  ? trafficCategoriesSummary(panelsStore.getTrafficCategoriesForPanel(props.panel.id))
  : null))

// Filter state (logs / error_list)
const statusClassFilter = ref<'all' | '2xx' | '4xx' | '5xx'>('all')
const searchFilter = ref<string>('')

const searchPlaceholder = computed(() => {
  if (props.type === 'error_list')
    return 'Filter by path or message...'
  if (props.type === 'bottleneck')
    return 'Filter by route...'

  return 'Filter path, method, status...'
})

// Filter state (bottleneck)
// Seeded once from the panel's saved filter, deliberately not kept in sync
// afterwards: these refs are the source of truth from mount on, and the watcher
// below writes every change back to the panel. Re-reading props into them would
// feed that write back in as an input and loop.
// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const bottleneckStatisticFilter = ref<BottleneckStatistic>(props.panel.statistic ?? 'avg')
// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const bottleneckSortFilter = ref<'asc' | 'desc'>(props.panel.sort ?? 'desc')

const bottleneckColumns: { label: string, stat: BottleneckStatistic }[] = [
  { label: 'Count', stat: 'count' },
  { label: 'Avg', stat: 'avg' },
  { label: 'Min', stat: 'min' },
  { label: 'Max', stat: 'max' },
  { label: 'Median', stat: 'median' },
]

function setBottleneckSort(stat: BottleneckStatistic) {
  if (bottleneckStatisticFilter.value === stat) {
    bottleneckSortFilter.value = bottleneckSortFilter.value === 'desc'
      ? 'asc'
      : 'desc'
  }
  else {
    bottleneckStatisticFilter.value = stat
  }
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(statusClassFilter, () => {
  applyFilters()
})

watch([bottleneckStatisticFilter, bottleneckSortFilter], () => {
  applyFilters()
})

watch(searchFilter, () => {
  if (searchDebounceTimer)
    clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(applyFilters, 300)
})

function applyFilters() {
  if (props.type === 'error_list') {
    panelsStore.updateErrorListFilter(props.panel.id, searchFilter.value || undefined)
  }
  else if (props.type === 'bottleneck') {
    panelsStore.updateBottleneckListFilter(props.panel.id, {
      statistic: bottleneckStatisticFilter.value,
      sort: bottleneckSortFilter.value,
      search: searchFilter.value || undefined,
    })
  }
  else {
    const sc = statusClassFilter.value === 'all'
      ? undefined
      : statusClassFilter.value
    panelsStore.updateLogsFilter(props.panel.id, sc, searchFilter.value || undefined)
  }
}

async function buildExport(): Promise<PanelExportBuildResult> {
  const uiFields = ['expanded', 'isNew']

  if (props.type === 'bottleneck') {
    const { truncated } = await panelsStore.fetchAllBottleneckEntriesForPanel(props.panel)
    const entries = panelsStore.getBottleneckListForPanel(props.panel.id)
    const meta = panelsStore.getBottleneckListMeta(props.panel.id)

    const rows = entries.map((entry) => {
      const { method, path } = parseRoute(entry.route)

      return {
        method,
        path,
        route: entry.route,
        value: entry.value,
        request_count: entry.request_count,
        min_value_ms: entry.min_value,
        max_value_ms: entry.max_value,
        avg_value_ms: entry.avg_value,
        median_value_ms: entry.median_value,
      }
    })

    return {
      rows,
      summary: {
        statistic: bottleneckStatisticFilter.value,
        sort: bottleneckSortFilter.value,
        max_value: meta?.max_value,
        total_rows: rows.length,
      },
      extraMeta: { search: props.panel.search },
      truncated,
    }
  }

  const fetchAll = props.type === 'logs'
    ? panelsStore.fetchAllLogsForPanel
    : panelsStore.fetchAllErrorsForPanel
  const getItems = props.type === 'logs'
    ? panelsStore.getLogsForPanel
    : panelsStore.getErrorsForPanel

  const { truncated } = await fetchAll(props.panel)
  const items = getItems(props.panel.id)
  const rows = items.map(item => omitUiFields(item, uiFields))

  const trafficCategories = panelsStore.getTrafficCategoriesForPanel(props.panel.id)

  return {
    rows,
    summary: { total_rows: rows.length },
    extraMeta: props.type === 'logs'
      ? { statusClass: props.panel.statusClass, search: props.panel.search, trafficCategories }
      : { search: props.panel.search, trafficCategories },
    truncated,
  }
}

const icon = computed(() => {
  if (props.type === 'logs')
    return 'mdi-text-box-outline'
  if (props.type === 'bottleneck')
    return 'mdi-speedometer'

  return 'mdi-format-list-bulleted'
})
const iconColor = computed(() => {
  if (props.type === 'logs')
    return 'primary'
  if (props.type === 'bottleneck')
    return 'warning'

  return 'error'
})
const emptyIcon = computed(() => {
  if (props.type === 'logs')
    return 'mdi-text-box-check'
  if (props.type === 'bottleneck')
    return 'mdi-speedometer'

  return 'mdi-check-circle'
})
const emptyMessage = computed(() => {
  if (props.type === 'logs')
    return 'No request logs found'
  if (props.type === 'bottleneck')
    return 'No endpoint data found'

  return 'No errors found'
})

// Error grouped row status bar (red for 5xx/no-code, amber for 4xx)
function getErrorStatusBarClass(item: ListItem): string {
  const code = item.status_code
  if (!code)
    return 'status-bar--error'
  if (code >= 500)
    return 'status-bar--error'
  if (code >= 400)
    return 'status-bar--warning'

  return 'status-bar--error'
}

// HTTP status helpers
function getStatusBarClass(item: ListItem): string {
  const code = item.status_code
  if (!code)
    return 'status-bar--grey'
  if (code < 300)
    return 'status-bar--success'
  if (code < 500)
    return 'status-bar--warning'

  return 'status-bar--error'
}

function getStatusTextClass(item: ListItem): string {
  const code = item.status_code
  if (!code)
    return 'text-medium-emphasis'
  if (code < 300)
    return 'text-success'
  if (code < 500)
    return 'text-warning'

  return 'text-error'
}

function getStatusChipColor(item: ListItem): string {
  const code = item.status_code
  if (!code)
    return 'grey'
  if (code < 300)
    return 'success'
  if (code < 500)
    return 'warning'

  return 'error'
}

function getMethodColor(method?: string): string {
  const colors: Record<string, string> = {
    GET: 'success',
    POST: 'info',
    PUT: 'orange',
    PATCH: 'purple',
    DELETE: 'error',
    HEAD: 'grey',
    OPTIONS: 'grey',
  }

  return colors[method?.toUpperCase() ?? ''] || 'grey'
}

function formatDuration(ms?: number): string {
  if (ms == null)
    return '—'
  if (ms >= 1000)
    return `${(ms / 1000).toFixed(1)}s`

  return `${ms}ms`
}

function formatValue(ms?: number | null): string {
  if (ms == null || ms === 0)
    return '—'
  if (ms >= 60000)
    return `${(ms / 60000).toFixed(1)}m`
  if (ms >= 1000)
    return `${(ms / 1000).toFixed(1)}s`

  return `${Math.round(ms)}ms`
}

function formatCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000)
    return `${(n / 1000).toFixed(1)}k`

  return String(n)
}

function parseRoute(route?: string): { method: string, path: string } {
  if (!route)
    return { method: '?', path: '—' }
  const idx = route.indexOf(' ')
  if (idx === -1)
    return { method: '?', path: route }

  return { method: route.slice(0, idx), path: route.slice(idx + 1) }
}

function getValueBarClass(value?: number, max?: number): string {
  if (!value || !max || max === 0)
    return 'status-bar--grey'
  const pct = (value / max) * 100
  if (pct >= 80)
    return 'status-bar--error'
  if (pct >= 50)
    return 'status-bar--warning'

  return 'status-bar--success'
}

function getValueBarColor(value?: number, max?: number): string {
  if (!value || !max || max === 0)
    return 'grey'
  const pct = (value / max) * 100
  if (pct >= 80)
    return 'error'
  if (pct >= 50)
    return 'warning'

  return 'success'
}

function toggleExpanded(item: ListItem) {
  item.expanded = !item.expanded
}

function onIntersect(isIntersecting: boolean) {
  if (isIntersecting && props.hasMore && !props.loading) {
    const newOffset = (props.offset || 0) + (props.items?.length || 0)
    emit('loadPage', newOffset)
  }
}

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})
</script>

<style scoped>
/* Logs: compact row list */
.log-list {
  height: 100%;
  overflow-y: auto;
}

.log-header-row {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: rgb(var(--v-theme-surface));
  padding: 4px 12px 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-height: 28px;
}

.log-row {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.log-row:last-child {
  border-bottom: none;
}

.log-row-header {
  padding: 6px 12px 6px 0;
  min-height: 36px;
  gap: 0;
}

.log-row-header:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
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
.status-bar--grey    { background-color: rgba(var(--v-border-color), 0.3); }

.method-chip {
  font-size: 10px;
  min-width: 44px;
  justify-content: center;
}

.log-path {
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.duration-col {
  min-width: 48px;
  text-align: right;
}

.time-col {
  min-width: 60px;
  text-align: right;
}

.log-row-detail {
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
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

/* Filter row */
.search-input {
  max-width: 280px;
  flex: 1;
}

/* Bottleneck sortable column headers */
.sort-col-header {
  min-width: 46px;
  text-align: right;
  padding: 0 4px;
  cursor: pointer;
  background: none;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  line-height: 1;
}
.sort-col-header:hover {
  color: rgba(var(--v-theme-on-surface), 0.9) !important;
}
.active-sort-col {
  color: rgb(var(--v-theme-primary)) !important;
}

/* Bottleneck row stat value cells */
.sort-col-value {
  min-width: 46px;
  text-align: right;
  padding: 0 4px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.active-col-value {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

/* Error cards (errors type) */
.item-card {
  transition: all 0.2s ease;
}

/* Content container for errors */
:deep(.panel-content-container) {
  height: 100%;
  overflow-y: auto;
}
</style>
