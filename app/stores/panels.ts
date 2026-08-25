import type {
  AggregatedMetricsResponse,
  BottleneckListEntry,
  BottleneckListResponse,
  BottleneckSort,
  BottleneckStatistic,
  CountryBreakdownEntry,
  CountryBreakdownResponse,
  CreatePanelRequest,
  MetricsQueryParams,
  Panel,
  PanelListResponse,
  TimeRangePreset,
  UpdatePanelRequest,
} from '~/types/panel'
import type { TrafficCategory } from '~/utils/clientChannel'
import { defineStore } from 'pinia'

// --- Tabs types ---
interface DashboardTab {
  id: string
  name: string
  templateId: string | null
  panelIds: string[]
  projectId: string | null
}

const TABS_STORAGE_KEY = 'ledger_dashboard_tabs'
const ACTIVE_TAB_STORAGE_KEY = 'ledger_active_tab'
const TABS_VERSION_KEY = 'ledger_tabs_migrated_v1'
const TABS_VERSION_KEY_V2 = 'ledger_tabs_migrated_v2'

// A panel with no stored selection - or one stored before per-panel filters
// existed - shows every category.
function panelTrafficCategories(panel: Panel): TrafficCategory[] {
  const stored = panel.trafficCategories?.filter((c): c is TrafficCategory => TRAFFIC_CATEGORIES.includes(c))

  return stored && stored.length > 0
    ? stored
    : [...TRAFFIC_CATEGORIES]
}

function loadTabsFromStorage(): DashboardTab[] {
  try {
    if (typeof localStorage === 'undefined')
      return []
    const raw = localStorage.getItem(TABS_STORAGE_KEY)

    return raw
      ? JSON.parse(raw)
      : []
  }
  catch { return [] }
}

function saveTabsToStorage(tabs: DashboardTab[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs))
    }
  }
  catch { /* noop */ }
}

function panelErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.detail || error?.message || fallback
}

let _syncTabsTimer: ReturnType<typeof setTimeout> | null = null

export const usePanelsStore = defineStore('panels', () => {
  const { client } = useApiStore()

  const panels = ref<Panel[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)
  const hasData = computed(() => panels.value.length > 0)

  // Every panel data source carries its own error map alongside its loading
  // state: without one a failed fetch is indistinguishable from an empty
  // result, and each panel's empty state tells the user to go set up their SDK.
  const panelMetrics = ref<Map<string, AggregatedMetricsResponse>>(new Map())
  const metricsLoading = ref<Set<string>>(new Set())
  const metricsError = ref<Map<string, string>>(new Map())

  const panelErrors = ref<Map<string, any[]>>(new Map())
  const errorsLoading = ref<Set<string>>(new Set())
  const errorsOffset = ref<Map<string, number>>(new Map())
  const errorsHasMore = ref<Map<string, boolean>>(new Map())
  const errorsError = ref<Map<string, string>>(new Map())

  const panelLogs = ref<Map<string, any[]>>(new Map())
  const logsLoading = ref<Set<string>>(new Set())
  const logsOffset = ref<Map<string, number>>(new Map())
  const logsHasMore = ref<Map<string, boolean>>(new Map())
  const logsError = ref<Map<string, string>>(new Map())

  const panelBottleneckEntries = ref<Map<string, (BottleneckListEntry & { max_value_route?: number | null })[]>>(new Map())
  const panelBottleneckMeta = ref<Map<string, { max_value: number, total: number, has_more: boolean }>>(new Map())
  const bottleneckListLoading = ref<Set<string>>(new Set())
  const bottleneckOffset = ref<Map<string, number>>(new Map())
  const bottleneckListError = ref<Map<string, string>>(new Map())

  // --- Tabs state ---
  const tabs = ref<DashboardTab[]>(import.meta.client
    ? loadTabsFromStorage()
    : [])
  const activeTabId = ref<string>(
    import.meta.client
      ? (localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) ?? '')
      : '',
  )

  const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value) ?? tabs.value[0] ?? null,
  )

  const panelCountryBreakdown = ref<Map<string, CountryBreakdownEntry[]>>(new Map())
  const countryBreakdownLoading = ref<Set<string>>(new Set())
  const countryBreakdownError = ref<Map<string, string>>(new Map())

  // Per-panel traffic filter: which caller categories a raw-log-backed panel
  // (HTTP Request Log, Error List, country map) reads. Chart/KPI panels read
  // pre-aggregated rollups with no channel dimension, so they always show all
  // traffic - see isAnyTrafficFilterActive, used by those panels to surface a
  // "counts all traffic" hint rather than silently disagreeing with a narrowed
  // panel next to them.
  const getTrafficCategoriesForPanel = (panelId: string): TrafficCategory[] => {
    const panel = panels.value.find(p => p.id === panelId)

    return panel
      ? panelTrafficCategories(panel)
      : [...TRAFFIC_CATEGORIES]
  }

  function _appendTrafficChannelParams(searchParams: URLSearchParams, panel: Panel) {
    const channels = channelsForCategories(panelTrafficCategories(panel))
    if (channels) {
      for (const channel of channels)
        searchParams.append('client_channel', channel)
    }
  }

  const sortedPanels = computed(() => [...panels.value].sort((a, b) => a.index - b.index),
  )

  const fetchPanels = async (force = false) => {
    if (isLoading.value)
      return

    if (!force && hasData.value)
      return

    isLoading.value = true

    try {
      const response = await client.get<PanelListResponse>('/api/v1/dashboard/panels')

      panels.value = response.data.panels
      total.value = response.data.total
      lastFetchTime.value = new Date()
    }
    catch (error) {
      console.error('Error fetching panels:', error)
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  const refreshPanels = async () => {
    await fetchPanels(true)
  }

  const fetchMetricsForPanel = async (panel: Panel, params?: Partial<MetricsQueryParams>) => {
    if (metricsLoading.value.has(panel.id))
      return

    metricsLoading.value.add(panel.id)
    metricsError.value.delete(panel.id)

    try {
      const searchParams = new URLSearchParams()

      searchParams.set('project_id', panel.project_id)

      let metricsType: 'exception' | 'endpoint' | 'log_volume'
      if (panel.type === 'errors') {
        metricsType = 'exception'
      }
      else if (panel.type === 'metrics' || panel.type === 'summary' || panel.type === 'latency_overview') {
        metricsType = 'endpoint'
      }
      else {
        metricsType = 'log_volume'
      }
      searchParams.set('type', metricsType)

      if (metricsType === 'endpoint' && panel.type === 'metrics') {
        const rawEndpoint = params?.endpointPath || panel.endpoint
        if (rawEndpoint) {
          const spaceIdx = rawEndpoint.indexOf(' ')
          const endpointPath = spaceIdx !== -1
            ? rawEndpoint.slice(spaceIdx + 1)
            : rawEndpoint
          searchParams.set('endpointPath', endpointPath)
        }
      }

      if (params?.periodFrom && params?.periodTo) {
        searchParams.set('periodFrom', params.periodFrom)
        searchParams.set('periodTo', params.periodTo)
      }
      else if (params?.period) {
        searchParams.set('period', params.period)
      }
      else if (panel.period) {
        searchParams.set('period', panel.period)
      }
      else if (panel.periodFrom && panel.periodTo) {
        searchParams.set('periodFrom', panel.periodFrom)
        searchParams.set('periodTo', panel.periodTo)
      }
      else {
        searchParams.set('period', 'last7days')
      }

      const response = await client.get<AggregatedMetricsResponse>(
        `/api/v1/metrics/aggregated?${searchParams.toString()}`,
      )

      panelMetrics.value.set(panel.id, response.data)
    }
    catch (error: any) {
      console.error(`Error fetching metrics for panel ${panel.id}:`, error)
      metricsError.value.set(panel.id, panelErrorMessage(error, 'Failed to load metrics'))
    }
    finally {
      metricsLoading.value.delete(panel.id)
    }
  }

  const getMetricsForPanel = (panelId: string) => {
    return panelMetrics.value.get(panelId)
  }

  const isMetricsLoading = (panelId: string) => {
    return metricsLoading.value.has(panelId)
  }

  const fetchErrorsForPanel = async (panel: Panel, offset = 0) => {
    if (errorsLoading.value.has(panel.id))
      return

    errorsLoading.value.add(panel.id)
    errorsError.value.delete(panel.id)

    try {
      const searchParams = new URLSearchParams()

      searchParams.set('project_id', panel.project_id)
      searchParams.set('limit', '25')
      searchParams.set('offset', String(offset))

      if (panel.period) {
        searchParams.set('period', panel.period)
      }
      else if (panel.periodFrom && panel.periodTo) {
        searchParams.set('periodFrom', panel.periodFrom)
        searchParams.set('periodTo', panel.periodTo)
      }
      else {
        searchParams.set('period', 'last7days')
      }

      if (panel.search) {
        searchParams.set('search', panel.search)
      }
      _appendTrafficChannelParams(searchParams, panel)

      const response = await client.get<any>(
        `/api/v1/errors/list?${searchParams.toString()}`,
      )

      const newErrors = response.data.errors.map((error: any) => ({
        ...error,
        expanded: false,
      }))

      const currentErrors = panelErrors.value.get(panel.id) || []

      if (offset === 0) {
        panelErrors.value.set(panel.id, newErrors)
      }
      else {
        panelErrors.value.set(panel.id, [...currentErrors, ...newErrors])
      }

      errorsOffset.value.set(panel.id, offset)
      errorsHasMore.value.set(panel.id, response.data.has_more)
    }
    catch (error: any) {
      console.error(`Error fetching errors for panel ${panel.id}:`, error)
      if (offset === 0) {
        panelErrors.value.set(panel.id, [])
      }
      errorsHasMore.value.set(panel.id, false)
      errorsError.value.set(panel.id, panelErrorMessage(error, 'Failed to load errors'))
    }
    finally {
      errorsLoading.value.delete(panel.id)
    }
  }

  const getErrorsForPanel = (panelId: string) => {
    return panelErrors.value.get(panelId) || []
  }

  const isErrorsLoading = (panelId: string) => {
    return errorsLoading.value.has(panelId)
  }

  const getErrorsHasMore = (panelId: string) => {
    return errorsHasMore.value.get(panelId) || false
  }

  const getErrorsOffset = (panelId: string) => {
    return errorsOffset.value.get(panelId) || 0
  }

  const MAX_EXPORT_ROWS = 5000

  const fetchAllErrorsForPanel = async (panel: Panel): Promise<{ truncated: boolean }> => {
    if ((panelErrors.value.get(panel.id) ?? []).length === 0) {
      await fetchErrorsForPanel(panel, 0)
    }

    while (getErrorsHasMore(panel.id)) {
      const before = (panelErrors.value.get(panel.id) ?? []).length
      if (before >= MAX_EXPORT_ROWS)
        return { truncated: true }

      // eslint-disable-next-line no-await-in-loop
      await fetchErrorsForPanel(panel, before)

      const after = (panelErrors.value.get(panel.id) ?? []).length
      if (after === before)
        break
    }

    return { truncated: false }
  }

  const _errorRefetchTimers = new Map<string, ReturnType<typeof setTimeout>>()

  const addNewErrorToPanel = (projectId: string, _error: any) => {
    for (const panel of panels.value) {
      if (panel.type === 'error_list' && panel.project_id === projectId) {
        // Debounced refetch — coalesces burst of incoming errors into one request
        const existing = _errorRefetchTimers.get(panel.id)
        if (existing)
          clearTimeout(existing)
        _errorRefetchTimers.set(panel.id, setTimeout(() => {
          _errorRefetchTimers.delete(panel.id)
          fetchErrorsForPanel(panel)
        }, 250))
      }
    }
  }

  const fetchLogsForPanel = async (panel: Panel, offset = 0) => {
    if (logsLoading.value.has(panel.id))
      return

    logsLoading.value.add(panel.id)
    logsError.value.delete(panel.id)

    try {
      const searchParams = new URLSearchParams()

      searchParams.set('project_id', panel.project_id)
      searchParams.set('limit', '25')
      searchParams.set('offset', String(offset))

      if (panel.period) {
        searchParams.set('period', panel.period)
      }
      else if (panel.periodFrom && panel.periodTo) {
        searchParams.set('periodFrom', panel.periodFrom)
        searchParams.set('periodTo', panel.periodTo)
      }
      else {
        searchParams.set('period', 'last7days')
      }

      if (panel.statusClass) {
        searchParams.set('status_class', panel.statusClass)
      }
      if (panel.search) {
        searchParams.set('search', panel.search)
      }
      _appendTrafficChannelParams(searchParams, panel)

      const response = await client.get<any>(
        `/api/v1/logs?${searchParams.toString()}`,
      )

      const newLogs = response.data.logs.map((log: any) => ({
        ...log,
        expanded: false,
      }))

      const currentLogs = panelLogs.value.get(panel.id) || []

      if (offset === 0) {
        panelLogs.value.set(panel.id, newLogs)
      }
      else {
        panelLogs.value.set(panel.id, [...currentLogs, ...newLogs])
      }

      logsOffset.value.set(panel.id, offset)
      logsHasMore.value.set(panel.id, response.data.has_more)
    }
    catch (error: any) {
      console.error(`Error fetching logs for panel ${panel.id}:`, error)
      if (offset === 0) {
        panelLogs.value.set(panel.id, [])
      }
      logsHasMore.value.set(panel.id, false)
      logsError.value.set(panel.id, panelErrorMessage(error, 'Failed to load logs'))
    }
    finally {
      logsLoading.value.delete(panel.id)
    }
  }

  const getLogsForPanel = (panelId: string) => {
    return panelLogs.value.get(panelId) || []
  }

  const isLogsLoading = (panelId: string) => {
    return logsLoading.value.has(panelId)
  }

  const getLogsHasMore = (panelId: string) => {
    return logsHasMore.value.get(panelId) || false
  }

  const getLogsOffset = (panelId: string) => {
    return logsOffset.value.get(panelId) || 0
  }

  const fetchAllLogsForPanel = async (panel: Panel): Promise<{ truncated: boolean }> => {
    if ((panelLogs.value.get(panel.id) ?? []).length === 0) {
      await fetchLogsForPanel(panel, 0)
    }

    while (getLogsHasMore(panel.id)) {
      const before = (panelLogs.value.get(panel.id) ?? []).length
      if (before >= MAX_EXPORT_ROWS)
        return { truncated: true }

      // eslint-disable-next-line no-await-in-loop
      await fetchLogsForPanel(panel, before)

      const after = (panelLogs.value.get(panel.id) ?? []).length
      if (after === before)
        break
    }

    return { truncated: false }
  }

  const fetchBottleneckListForPanel = async (panel: Panel, opts?: { append?: boolean }) => {
    if (bottleneckListLoading.value.has(panel.id))
      return

    const limit = 25
    const offset = opts?.append
      ? (bottleneckOffset.value.get(panel.id) ?? 0)
      : 0

    bottleneckListLoading.value.add(panel.id)
    bottleneckListError.value.delete(panel.id)

    try {
      const searchParams = new URLSearchParams()
      searchParams.set('project_id', panel.project_id)
      searchParams.set('statistic', panel.statistic ?? 'avg')
      searchParams.set('sort', panel.sort ?? 'desc')
      searchParams.set('limit', String(limit))
      searchParams.set('offset', String(offset))

      if (panel.search)
        searchParams.set('search', panel.search)

      if (panel.period) {
        searchParams.set('period', panel.period)
      }
      else if (panel.periodFrom && panel.periodTo) {
        searchParams.set('periodFrom', panel.periodFrom)
        searchParams.set('periodTo', panel.periodTo)
      }
      else {
        searchParams.set('period', 'last7days')
      }

      const response = await client.get<BottleneckListResponse>(
        `/api/v1/metrics/bottleneck/list?${searchParams.toString()}`,
      )

      const data = response.data
      const mapped = data.entries.map(e => ({
        ...e,
        max_value_route: e.max_value,
      }))
      if (opts?.append) {
        const existing = panelBottleneckEntries.value.get(panel.id) ?? []
        panelBottleneckEntries.value.set(panel.id, [...existing, ...mapped])
      }
      else {
        panelBottleneckEntries.value.set(panel.id, mapped)
      }

      panelBottleneckMeta.value.set(panel.id, {
        max_value: data.max_value,
        total: data.total,
        has_more: data.has_more,
      })
      bottleneckOffset.value.set(panel.id, offset + data.entries.length)
    }
    catch (error: any) {
      console.error(`Error fetching bottleneck list for panel ${panel.id}:`, error)
      if (!opts?.append)
        panelBottleneckEntries.value.set(panel.id, [])
      bottleneckListError.value.set(panel.id, panelErrorMessage(error, 'Failed to load bottlenecks'))
    }
    finally {
      bottleneckListLoading.value.delete(panel.id)
    }
  }

  const updateBottleneckListFilter = async (
    panelId: string,
    patch: { statistic?: BottleneckStatistic, sort?: BottleneckSort, search?: string },
  ) => {
    const panel = panels.value.find(p => p.id === panelId)
    if (!panel)
      return

    if (patch.statistic !== undefined)
      panel.statistic = patch.statistic
    if (patch.sort !== undefined)
      panel.sort = patch.sort
    if ('search' in patch)
      panel.search = patch.search || undefined

    await updatePanel(panelId, {
      name: panel.name,
      index: panel.index,
      project_id: panel.project_id,
      type: panel.type,
      statistic: panel.statistic ?? null,
      sort: panel.sort ?? null,
      search: panel.search ?? null,
    })

    bottleneckOffset.value.set(panelId, 0)
    await fetchBottleneckListForPanel(panel)
  }

  const getBottleneckListForPanel = (panelId: string) => {
    return panelBottleneckEntries.value.get(panelId) ?? []
  }

  const getBottleneckListMeta = (panelId: string) => {
    return panelBottleneckMeta.value.get(panelId)
  }

  const isBottleneckListLoading = (panelId: string) => {
    return bottleneckListLoading.value.has(panelId)
  }

  const getBottleneckListHasMore = (panelId: string) => {
    return panelBottleneckMeta.value.get(panelId)?.has_more ?? false
  }

  const fetchAllBottleneckEntriesForPanel = async (panel: Panel): Promise<{ truncated: boolean }> => {
    if ((panelBottleneckEntries.value.get(panel.id) ?? []).length === 0) {
      await fetchBottleneckListForPanel(panel)
    }

    while (getBottleneckListHasMore(panel.id)) {
      const before = (panelBottleneckEntries.value.get(panel.id) ?? []).length
      if (before >= MAX_EXPORT_ROWS)
        return { truncated: true }

      // eslint-disable-next-line no-await-in-loop
      await fetchBottleneckListForPanel(panel, { append: true })

      const after = (panelBottleneckEntries.value.get(panel.id) ?? []).length
      if (after === before)
        break
    }

    return { truncated: false }
  }

  const fetchHeatmapForPanel = async (panel: Panel) => {
    if (metricsLoading.value.has(panel.id))
      return

    metricsLoading.value.add(panel.id)

    try {
      const searchParams = new URLSearchParams()
      searchParams.set('project_id', panel.project_id)
      searchParams.set('type', 'exception')

      if (panel.period) {
        searchParams.set('period', panel.period)
      }
      else if (panel.periodFrom && panel.periodTo) {
        searchParams.set('periodFrom', panel.periodFrom)
        searchParams.set('periodTo', panel.periodTo)
      }
      else {
        searchParams.set('period', 'last7days')
      }

      const response = await client.get<AggregatedMetricsResponse>(
        `/api/v1/metrics/aggregated?${searchParams.toString()}`,
      )

      panelMetrics.value.set(panel.id, response.data)
    }
    catch (error: any) {
      console.error(`Error fetching heatmap for panel ${panel.id}:`, error)
      metricsError.value.set(panel.id, panelErrorMessage(error, 'Failed to load heatmap'))
    }
    finally {
      metricsLoading.value.delete(panel.id)
    }
  }

  const fetchCountryBreakdownForPanel = async (panel: Panel) => {
    if (countryBreakdownLoading.value.has(panel.id))
      return

    countryBreakdownLoading.value.add(panel.id)
    countryBreakdownError.value.delete(panel.id)

    try {
      const searchParams = new URLSearchParams()
      searchParams.set('project_id', panel.project_id)
      searchParams.set('limit', '250')

      if (panel.period) {
        searchParams.set('period', panel.period)
      }
      else if (panel.periodFrom && panel.periodTo) {
        searchParams.set('periodFrom', panel.periodFrom)
        searchParams.set('periodTo', panel.periodTo)
      }
      else {
        searchParams.set('period', 'last7days')
      }
      _appendTrafficChannelParams(searchParams, panel)

      const response = await client.get<CountryBreakdownResponse>(
        `/api/v1/logs/country-breakdown?${searchParams.toString()}`,
      )

      panelCountryBreakdown.value.set(panel.id, response.data.countries)
    }
    catch (error: any) {
      console.error(`Error fetching country breakdown for panel ${panel.id}:`, error)
      // Unlike the other fetchers, the map needs to tell "failed" apart from
      // "genuinely no countries resolved yet" - both look like an empty
      // array otherwise, but they need different empty states.
      countryBreakdownError.value.set(
        panel.id,
        error.response?.data?.detail || error.message || 'Failed to load country breakdown',
      )
      panelCountryBreakdown.value.set(panel.id, [])
    }
    finally {
      countryBreakdownLoading.value.delete(panel.id)
    }
  }

  const getCountryBreakdownForPanel = (panelId: string) => {
    return panelCountryBreakdown.value.get(panelId) ?? []
  }

  const isCountryBreakdownLoading = (panelId: string) => {
    return countryBreakdownLoading.value.has(panelId)
  }

  const getCountryBreakdownError = (panelId: string) => {
    return countryBreakdownError.value.get(panelId) ?? null
  }

  const getMetricsError = (panelId: string) => {
    return metricsError.value.get(panelId) ?? null
  }

  const getErrorsError = (panelId: string) => {
    return errorsError.value.get(panelId) ?? null
  }

  const getLogsError = (panelId: string) => {
    return logsError.value.get(panelId) ?? null
  }

  const getBottleneckListError = (panelId: string) => {
    return bottleneckListError.value.get(panelId) ?? null
  }

  const SERVER_PANEL_TYPES = ['logs', 'errors', 'metrics', 'error_list', 'bottleneck', 'error_heatmap', 'trace', 'trace_list', 'summary', 'latency_overview', 'country_map']

  function toServerPayload(data: Partial<CreatePanelRequest | UpdatePanelRequest>): Record<string, any> {
    const payload: Record<string, any> = {}
    const allowed = [
      'name',
      'index',
      'project_id',
      'type',
      'endpoint',
      'routes',
      'statistic',
      'period',
      'periodFrom',
      'periodTo',
      'layout',
      'trace_id',
      'service_filter',
      'operation_filter',
      'min_duration_ms',
      'has_error',
      'statusClass',
      'search',
      'trafficCategories',
    ]
    for (const key of allowed) {
      const value = (data as any)[key]
      if (value !== undefined)
        payload[key] = value
    }

    return payload
  }

  const createPanel = async (data: CreatePanelRequest) => {
    if (!SERVER_PANEL_TYPES.includes(data.type)) {
      return { success: false, error: `Panel type "${data.type}" not supported by server` }
    }
    try {
      const response = await client.post<Panel>('/api/v1/dashboard/panels', toServerPayload(data))

      panels.value.push(response.data)
      total.value += 1

      const panelProjectId = response.data.project_id
      let targetTab = activeTab.value?.projectId === panelProjectId
        ? activeTab.value
        : null
      if (!targetTab) {
        const projectTabs = tabsForProject(panelProjectId)
        targetTab = projectTabs.find(t => t.projectId === panelProjectId) ?? null
      }
      if (!targetTab) {
        targetTab = addTab('Default', null, panelProjectId)
        setActiveTab(targetTab.id)
      }
      targetTab.panelIds.push(response.data.id)
      persistTabs(tabs.value)

      return { success: true, panel: response.data }
    }
    catch (error: any) {
      console.error('Error creating panel:', error)

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create panel'

      return { success: false, error: errorMessage }
    }
  }

  async function updatePanel(panelId: string, data: Partial<UpdatePanelRequest>) {
    try {
      const panel = panels.value.find(p => p.id === panelId)
      if (!panel) {
        return { success: false, error: 'Panel not found' }
      }

      const updateData: UpdatePanelRequest = {
        name: data.name ?? panel.name,
        index: data.index ?? panel.index,
        project_id: data.project_id ?? panel.project_id,
        type: data.type ?? panel.type,
        endpoint: data.endpoint !== undefined
          ? data.endpoint
          : panel.endpoint || null,
        routes: data.routes !== undefined
          ? data.routes
          : panel.routes || null,
        statistic: data.statistic !== undefined
          ? data.statistic
          : panel.statistic || null,
        period: data.period !== undefined
          ? data.period
          : panel.period || null,
        periodFrom: data.periodFrom !== undefined
          ? data.periodFrom
          : panel.periodFrom || null,
        periodTo: data.periodTo !== undefined
          ? data.periodTo
          : panel.periodTo || null,
        trace_id: data.trace_id !== undefined
          ? data.trace_id
          : panel.trace_id ?? null,
        service_filter: data.service_filter !== undefined
          ? data.service_filter
          : panel.service_filter ?? null,
        operation_filter: data.operation_filter !== undefined
          ? data.operation_filter
          : panel.operation_filter ?? null,
        min_duration_ms: data.min_duration_ms !== undefined
          ? data.min_duration_ms
          : panel.min_duration_ms ?? null,
        has_error: data.has_error !== undefined
          ? data.has_error
          : panel.has_error ?? null,
        statusClass: data.statusClass !== undefined
          ? data.statusClass
          : panel.statusClass ?? null,
        search: data.search !== undefined
          ? data.search
          : panel.search ?? null,
        trafficCategories: data.trafficCategories !== undefined
          ? data.trafficCategories
          : panel.trafficCategories ?? null,
      }

      const response = await client.put<Panel>(`/api/v1/dashboard/panels/${panelId}`, toServerPayload(updateData))

      const index = panels.value.findIndex(p => p.id === panelId)
      if (index !== -1) {
        panels.value[index] = response.data
      }

      return { success: true, panel: response.data }
    }
    catch (error: any) {
      console.error('Error updating panel:', error)

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update panel'

      return { success: false, error: errorMessage }
    }
  }

  const setTrafficCategoriesForPanel = async (
    panelId: string,
    categories: TrafficCategory[],
  ): Promise<{ success: boolean, error?: string }> => {
    const panel = panels.value.find(p => p.id === panelId)
    if (!panel)
      return { success: false, error: 'Panel not found' }

    // "Everything selected" is stored as an empty list so the panel keeps
    // meaning "all traffic" if a new category is added later.
    const selection = categories.length >= TRAFFIC_CATEGORIES.length
      ? []
      : categories

    const result = await updatePanel(panelId, { trafficCategories: selection })
    if (!result.success)
      return result

    const updated = panels.value.find(p => p.id === panelId)
    if (!updated)
      return result

    if (updated.type === 'logs') {
      logsOffset.value.set(panelId, 0)
      await fetchLogsForPanel(updated)
    }
    else if (updated.type === 'error_list') {
      errorsOffset.value.set(panelId, 0)
      await fetchErrorsForPanel(updated)
    }
    else if (updated.type === 'country_map') {
      await fetchCountryBreakdownForPanel(updated)
    }

    return result
  }

  const deletePanel = async (panelId: string) => {
    try {
      await client.delete(`/api/v1/dashboard/panels/${panelId}`)

      panels.value = panels.value.filter(p => p.id !== panelId)
      total.value -= 1
      panelMetrics.value.delete(panelId)
      panelErrors.value.delete(panelId)
      errorsOffset.value.delete(panelId)
      errorsHasMore.value.delete(panelId)
      panelLogs.value.delete(panelId)
      logsOffset.value.delete(panelId)
      logsHasMore.value.delete(panelId)
      panelCountryBreakdown.value.delete(panelId)
      countryBreakdownError.value.delete(panelId)
      metricsError.value.delete(panelId)
      errorsError.value.delete(panelId)
      logsError.value.delete(panelId)
      bottleneckListError.value.delete(panelId)
      panelBottleneckEntries.value.delete(panelId)
      panelBottleneckMeta.value.delete(panelId)
      bottleneckOffset.value.delete(panelId)

      tabs.value.forEach((tab) => {
        tab.panelIds = tab.panelIds.filter(id => id !== panelId)
      })
      saveTabsToStorage(tabs.value)

      return { success: true }
    }
    catch (error: any) {
      console.error('Error deleting panel:', error)

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete panel'

      return { success: false, error: errorMessage }
    }
  }

  const updatePanelIndexes = async (updatedPanels: { id: string, index: number }[]) => {
    try {
      await Promise.all(
        updatedPanels.map(({ id, index }) => {
          const panel = panels.value.find(p => p.id === id)
          if (!panel)
            return Promise.resolve()

          const updateData: UpdatePanelRequest = {
            name: panel.name,
            index,
            project_id: panel.project_id,
            type: panel.type,
            endpoint: panel.endpoint || null,
            routes: panel.routes || null,
            statistic: panel.statistic || null,
            period: panel.period || null,
            periodFrom: panel.periodFrom || null,
            periodTo: panel.periodTo || null,
            trace_id: panel.trace_id ?? null,
            service_filter: panel.service_filter ?? null,
            operation_filter: panel.operation_filter ?? null,
            min_duration_ms: panel.min_duration_ms ?? null,
            has_error: panel.has_error ?? null,
            statusClass: panel.statusClass ?? null,
            search: panel.search ?? null,
            trafficCategories: panel.trafficCategories ?? null,
          }

          return client.put(`/api/v1/dashboard/panels/${id}`, toServerPayload(updateData))
        }),
      )

      for (const { id, index } of updatedPanels) {
        const panel = panels.value.find(p => p.id === id)
        if (panel) {
          panel.index = index
        }
      }

      return { success: true }
    }
    catch (error: any) {
      console.error('Error updating panel indexes:', error)

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update panel order'

      return { success: false, error: errorMessage }
    }
  }

  const updateLogsFilter = async (
    panelId: string,
    statusClass: '2xx' | '4xx' | '5xx' | undefined,
    search: string | undefined,
  ) => {
    const panel = panels.value.find(p => p.id === panelId)
    if (!panel)
      return

    panel.statusClass = statusClass ?? undefined
    panel.search = search ?? undefined

    await updatePanel(panelId, {
      statusClass: statusClass ?? null,
      search: search ?? null,
    })

    logsOffset.value.set(panelId, 0)
    await fetchLogsForPanel(panel)
  }

  const updateErrorListFilter = async (
    panelId: string,
    search: string | undefined,
  ) => {
    const panel = panels.value.find(p => p.id === panelId)
    if (!panel)
      return

    panel.search = search ?? undefined

    await updatePanel(panelId, {
      search: search ?? null,
    })

    errorsOffset.value.set(panelId, 0)
    await fetchErrorsForPanel(panel)
  }

  const updatePanelTimeRange = async (
    panelId: string,
    timeRange: { period?: TimeRangePreset | null, periodFrom?: string | null, periodTo?: string | null },
  ) => {
    try {
      const panel = panels.value.find(p => p.id === panelId)
      if (!panel) {
        return { success: false, error: 'Panel not found' }
      }

      const updateData: UpdatePanelRequest = {
        name: panel.name,
        index: panel.index,
        project_id: panel.project_id,
        type: panel.type,
        endpoint: panel.endpoint || null,
        routes: panel.routes || null,
        statistic: panel.statistic || null,
        period: timeRange.period !== undefined
          ? timeRange.period
          : null,
        periodFrom: timeRange.periodFrom !== undefined
          ? timeRange.periodFrom
          : null,
        periodTo: timeRange.periodTo !== undefined
          ? timeRange.periodTo
          : null,
        // A full-panel PUT: anything omitted here is cleared server-side, so
        // the panel's own filters have to be carried through a time change.
        statusClass: panel.statusClass ?? null,
        search: panel.search ?? null,
        trafficCategories: panel.trafficCategories ?? null,
      }

      const response = await client.put<Panel>(`/api/v1/dashboard/panels/${panelId}`, toServerPayload(updateData))

      const index = panels.value.findIndex(p => p.id === panelId)
      if (index !== -1) {
        panels.value[index] = response.data
      }

      if (response.data.type === 'error_list') {
        await fetchErrorsForPanel(response.data)
      }
      else if (response.data.type === 'logs') {
        await fetchLogsForPanel(response.data)
      }
      else if (response.data.type === 'bottleneck') {
        await fetchBottleneckListForPanel(response.data)
      }
      else if (response.data.type === 'error_heatmap') {
        await fetchHeatmapForPanel(response.data)
      }
      else if (response.data.type === 'country_map') {
        await fetchCountryBreakdownForPanel(response.data)
      }
      else if (response.data.type !== 'trace' && response.data.type !== 'trace_list') {
        await fetchMetricsForPanel(response.data)
      }

      return { success: true, panel: response.data }
    }
    catch (error: any) {
      console.error('Error updating panel time range:', error)

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update time range'

      return { success: false, error: errorMessage }
    }
  }

  const activePanels = computed(() => {
    if (!activeTab.value)
      return sortedPanels.value

    return activeTab.value.panelIds
      .map(id => panels.value.find(p => p.id === id))
      .filter((p): p is Panel => !!p)
      .sort((a, b) => a.index - b.index)
  })

  const isAnyTrafficFilterActive = computed(() => activePanels.value.some(
    p => panelTrafficCategories(p).length < TRAFFIC_CATEGORIES.length,
  ))

  async function fetchTabs() {
    try {
      const response = await client.get<{ tabs: DashboardTab[], active_tab_id: string | null }>('/api/v1/dashboard/tabs')
      const serverTabs = response.data.tabs
      const serverActiveTabId = response.data.active_tab_id

      if (serverTabs.length > 0) {
        tabs.value = serverTabs
        saveTabsToStorage(serverTabs)
        if (serverActiveTabId) {
          activeTabId.value = serverActiveTabId
          if (import.meta.client)
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, serverActiveTabId)
        }
      }
    }
    catch (error) {
      console.error('Error fetching tabs from server:', error)
    }
  }

  function syncTabsToServer(currentTabs: DashboardTab[], currentActiveTabId: string) {
    if (_syncTabsTimer !== null)
      clearTimeout(_syncTabsTimer)

    _syncTabsTimer = setTimeout(async () => {
      try {
        await client.put('/api/v1/dashboard/tabs', {
          tabs: currentTabs,
          active_tab_id: currentActiveTabId || null,
        })
      }
      catch (error) {
        console.error('Error syncing tabs to server:', error)
      }
    }, 500)
  }

  function setActiveTab(tabId: string) {
    activeTabId.value = tabId
    if (import.meta.client)
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabId)
    syncTabsToServer(tabs.value, tabId)
  }

  function addTab(name: string, templateId: string | null = null, projectId: string | null = null): DashboardTab {
    const tab: DashboardTab = {
      id: `tab-${Date.now()}`,
      name,
      templateId,
      panelIds: [],
      projectId,
    }
    tabs.value.push(tab)
    persistTabs(tabs.value)

    return tab
  }

  function tabsForProject(projectId: string | null): DashboardTab[] {
    if (!projectId)
      return tabs.value

    return tabs.value.filter(t => t.projectId === projectId || t.projectId === null)
  }

  function persistTabs(updatedTabs: DashboardTab[]) {
    saveTabsToStorage(updatedTabs)
    syncTabsToServer(updatedTabs, activeTabId.value)
  }

  function renameTab(tabId: string, name: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.name = name
      persistTabs(tabs.value)
    }
  }

  async function deleteTab(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      await Promise.all(tab.panelIds.map(id => deletePanel(id)))
    }
    tabs.value = tabs.value.filter(t => t.id !== tabId)
    persistTabs(tabs.value)
    if (activeTabId.value === tabId && tabs.value.length > 0) {
      setActiveTab(tabs.value[0]!.id)
    }
  }

  function reorderTabs(newOrder: string[]) {
    const tabMap = new Map(tabs.value.map(t => [t.id, t]))
    tabs.value = newOrder.map(id => tabMap.get(id)!).filter(Boolean)
    persistTabs(tabs.value)
  }

  function addPanelToTab(tabId: string, panelId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab && !tab.panelIds.includes(panelId)) {
      tab.panelIds.push(panelId)
      persistTabs(tabs.value)
    }
  }

  function removePanelFromTabs(panelId: string) {
    tabs.value.forEach((tab) => {
      tab.panelIds = tab.panelIds.filter(id => id !== panelId)
    })
    persistTabs(tabs.value)
  }

  function migrateToTabs() {
    if (!import.meta.client)
      return

    // v1: initial migration — create tabs from flat panel list
    if (!localStorage.getItem(TABS_VERSION_KEY)) {
      if (tabs.value.length === 0 && panels.value.length > 0) {
        const byProject = new Map<string, string[]>()
        for (const p of panels.value) {
          const ids = byProject.get(p.project_id) ?? []
          ids.push(p.id)
          byProject.set(p.project_id, ids)
        }
        let firstTabId: string | null = null
        for (const [pid, ids] of byProject) {
          const t = addTab('Default', null, pid)
          t.panelIds = ids
          if (!firstTabId)
            firstTabId = t.id
        }
        persistTabs(tabs.value)
        if (firstTabId)
          setActiveTab(firstTabId)
      }
      localStorage.setItem(TABS_VERSION_KEY, '1')
    }

    // v2: upgrade null-projectId tabs to per-project tabs
    if (!localStorage.getItem(TABS_VERSION_KEY_V2)) {
      const nullTabs = tabs.value.filter(t => t.projectId === null)
      for (const tab of nullTabs) {
        const byProject = new Map<string, string[]>()
        for (const panelId of tab.panelIds) {
          const panel = panels.value.find(p => p.id === panelId)
          if (!panel)
            continue
          const ids = byProject.get(panel.project_id) ?? []
          ids.push(panelId)
          byProject.set(panel.project_id, ids)
        }
        tabs.value = tabs.value.filter(t => t.id !== tab.id)
        for (const [pid, ids] of byProject) {
          const newTab = addTab(tab.name, tab.templateId, pid)
          newTab.panelIds = ids
          if (activeTabId.value === tab.id)
            setActiveTab(newTab.id)
        }
      }
      persistTabs(tabs.value)
      localStorage.setItem(TABS_VERSION_KEY_V2, '1')
    }
  }

  async function applyTemplate(templateId: string, projectId: string | number) {
    const { templates } = await import('~/dashboards/templates')
    const template = templates.find(t => t.id === templateId)
    if (!template)
      return

    const tab = addTab(template.name, templateId, String(projectId))
    setActiveTab(tab.id)

    const created: Panel[] = []
    for (let i = 0; i < template.panels.length; i++) {
      const seed = template.panels[i]!
      // Sequential on purpose: createPanel() appends to the active tab's
      // panelIds and persists it, so parallel creates would race on that list.
      // eslint-disable-next-line no-await-in-loop
      const result = await createPanel({
        ...seed,
        project_id: String(projectId),
        index: i,
      } as CreatePanelRequest)
      if (result.success && result.panel) {
        created.push(result.panel)
        // createPanel already adds to activeTab, skip duplicate push
      }
    }

    saveTabsToStorage(tabs.value)

    return { tab, panels: created }
  }

  const findTracePanelByTraceId = (traceId: string): Panel | undefined => {
    return panels.value.find(p => p.type === 'trace' && p.trace_id === traceId)
  }

  return {
    panels,
    sortedPanels,
    total,
    isLoading,
    lastFetchTime,
    hasData,
    panelMetrics,
    fetchPanels,
    refreshPanels,
    fetchMetricsForPanel,
    getMetricsForPanel,
    isMetricsLoading,
    fetchErrorsForPanel,
    fetchAllErrorsForPanel,
    getErrorsForPanel,
    isErrorsLoading,
    getErrorsHasMore,
    getErrorsOffset,
    addNewErrorToPanel,
    fetchLogsForPanel,
    fetchAllLogsForPanel,
    getLogsForPanel,
    isLogsLoading,
    getLogsHasMore,
    getLogsOffset,
    updateLogsFilter,
    updateErrorListFilter,
    fetchBottleneckListForPanel,
    fetchAllBottleneckEntriesForPanel,
    updateBottleneckListFilter,
    getBottleneckListForPanel,
    getBottleneckListMeta,
    isBottleneckListLoading,
    getBottleneckListHasMore,
    fetchHeatmapForPanel,
    fetchCountryBreakdownForPanel,
    getCountryBreakdownForPanel,
    isCountryBreakdownLoading,
    getCountryBreakdownError,
    getMetricsError,
    getErrorsError,
    getLogsError,
    getBottleneckListError,
    getTrafficCategoriesForPanel,
    isAnyTrafficFilterActive,
    setTrafficCategoriesForPanel,
    createPanel,
    updatePanel,
    deletePanel,
    updatePanelIndexes,
    updatePanelTimeRange,
    // Tabs
    tabs,
    activeTabId,
    activeTab,
    activePanels,
    fetchTabs,
    setActiveTab,
    addTab,
    tabsForProject,
    renameTab,
    deleteTab,
    reorderTabs,
    addPanelToTab,
    removePanelFromTabs,
    migrateToTabs,
    applyTemplate,
    findTracePanelByTraceId,
  }
})
