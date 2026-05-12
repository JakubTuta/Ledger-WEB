import type {
  AggregatedMetricsResponse,
  BottleneckMetricsResponse,
  BottleneckStatistic,
  CreatePanelRequest,
  MetricsQueryParams,
  Panel,
  PanelListResponse,
  TimeRangePreset,
  UpdatePanelRequest,
} from '~/types/panel'
import { defineStore } from 'pinia'

// --- Tabs types ---
interface DashboardTab {
  id: string
  name: string
  templateId: string | null
  panelIds: string[]
}

const TABS_STORAGE_KEY = 'ledger_dashboard_tabs'
const ACTIVE_TAB_STORAGE_KEY = 'ledger_active_tab'
const TABS_VERSION_KEY = 'ledger_tabs_migrated_v1'

function loadTabsFromStorage(): DashboardTab[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(TABS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
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

export const usePanelsStore = defineStore('panels', () => {
  const { client } = useApiStore()

  const panels = ref<Panel[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)
  const hasData = computed(() => panels.value.length > 0)

  const panelMetrics = ref<Map<string, AggregatedMetricsResponse>>(new Map())
  const metricsLoading = ref<Set<string>>(new Set())

  const panelErrors = ref<Map<string, any[]>>(new Map())
  const errorsLoading = ref<Set<string>>(new Set())
  const errorsOffset = ref<Map<string, number>>(new Map())
  const errorsHasMore = ref<Map<string, boolean>>(new Map())

  const panelLogs = ref<Map<string, any[]>>(new Map())
  const logsLoading = ref<Set<string>>(new Set())
  const logsOffset = ref<Map<string, number>>(new Map())
  const logsHasMore = ref<Map<string, boolean>>(new Map())

  const panelBottlenecks = ref<Map<string, BottleneckMetricsResponse>>(new Map())
  const bottlenecksLoading = ref<Set<string>>(new Set())

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

    try {
      const searchParams = new URLSearchParams()

      searchParams.set('project_id', panel.project_id)

      let metricsType: 'exception' | 'endpoint' | 'log_volume'
      if (panel.type === 'errors') {
        metricsType = 'exception'
      }
      else if (panel.type === 'metrics') {
        metricsType = 'endpoint'
      }
      else {
        metricsType = 'log_volume'
      }
      searchParams.set('type', metricsType)

      if (metricsType === 'endpoint') {
        const endpointPath = params?.endpointPath || panel.endpoint
        if (endpointPath) {
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
    catch (error) {
      console.error(`Error fetching metrics for panel ${panel.id}:`, error)
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

      const response = await client.get<any>(
        `/api/v1/errors/list?${searchParams.toString()}`,
      )

      const newErrors = response.data.errors.map((error: any) => ({
        ...error,
        isNew: false,
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
    catch (error) {
      console.error(`Error fetching errors for panel ${panel.id}:`, error)
      if (offset === 0) {
        panelErrors.value.set(panel.id, [])
      }
      errorsHasMore.value.set(panel.id, false)
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

  const addNewErrorToPanel = (projectId: string, error: any) => {
    for (const panel of panels.value) {
      if (panel.type === 'error_list' && panel.project_id === projectId) {
        const currentErrors = panelErrors.value.get(panel.id) || []

        const newError = {
          ...error,
          log_id: Date.now(),
          project_id: Number.parseInt(projectId),
          isNew: true,
          expanded: false,
        }

        panelErrors.value.set(panel.id, [newError, ...currentErrors])
      }
    }
  }

  const fetchLogsForPanel = async (panel: Panel, offset = 0) => {
    if (logsLoading.value.has(panel.id))
      return

    logsLoading.value.add(panel.id)

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
    catch (error) {
      console.error(`Error fetching logs for panel ${panel.id}:`, error)
      if (offset === 0) {
        panelLogs.value.set(panel.id, [])
      }
      logsHasMore.value.set(panel.id, false)
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

  const fetchBottleneckForPanel = async (
    panel: Panel,
    routes: string[],
    statistic: BottleneckStatistic,
  ) => {
    if (bottlenecksLoading.value.has(panel.id))
      return

    if (routes.length === 0)
      return

    bottlenecksLoading.value.add(panel.id)

    try {
      const searchParams = new URLSearchParams()

      searchParams.set('project_id', panel.project_id)
      searchParams.set('statistic', statistic)

      routes.forEach(route => searchParams.append('routes', route))

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

      const response = await client.get<BottleneckMetricsResponse>(
        `/api/v1/metrics/bottleneck?${searchParams.toString()}`,
      )

      panelBottlenecks.value.set(panel.id, response.data)
    }
    catch (error) {
      console.error(`Error fetching bottleneck for panel ${panel.id}:`, error)
    }
    finally {
      bottlenecksLoading.value.delete(panel.id)
    }
  }

  const getBottleneckForPanel = (panelId: string) => {
    return panelBottlenecks.value.get(panelId)
  }

  const isBottleneckLoading = (panelId: string) => {
    return bottlenecksLoading.value.has(panelId)
  }

  const fetchHeatmapForPanel = async (panel: Panel) => {
    if (metricsLoading.value.has(panel.id)) return

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
    catch (error) {
      console.error(`Error fetching heatmap for panel ${panel.id}:`, error)
    }
    finally {
      metricsLoading.value.delete(panel.id)
    }
  }

  const SERVER_PANEL_TYPES = ['logs', 'errors', 'metrics', 'error_list', 'bottleneck', 'error_heatmap']

  function toServerPayload(data: Partial<CreatePanelRequest | UpdatePanelRequest>): Record<string, any> {
    const payload: Record<string, any> = {}
    const allowed = ['name', 'index', 'project_id', 'type', 'endpoint', 'routes', 'statistic', 'period', 'periodFrom', 'periodTo', 'layout']
    for (const key of allowed) {
      const value = (data as any)[key]
      if (value !== undefined) payload[key] = value
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

      // Add to active tab if one exists
      if (activeTab.value) {
        activeTab.value.panelIds.push(response.data.id)
        saveTabsToStorage(tabs.value)
      }

      return { success: true, panel: response.data }
    }
    catch (error: any) {
      console.error('Error creating panel:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to create panel'

      return { success: false, error: errorMessage }
    }
  }

  const updatePanel = async (panelId: string, data: Partial<UpdatePanelRequest>) => {
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

      const errorMessage = error.response?.data?.message || error.message || 'Failed to update panel'

      return { success: false, error: errorMessage }
    }
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
      panelBottlenecks.value.delete(panelId)

      // Remove from all tabs
      tabs.value.forEach((tab) => {
        tab.panelIds = tab.panelIds.filter(id => id !== panelId)
      })
      saveTabsToStorage(tabs.value)

      return { success: true }
    }
    catch (error: any) {
      console.error('Error deleting panel:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete panel'

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

      const errorMessage = error.response?.data?.message || error.message || 'Failed to update panel order'

      return { success: false, error: errorMessage }
    }
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
        const existingBottleneck = panelBottlenecks.value.get(response.data.id)
        if (existingBottleneck) {
          const routes = Array.from(new Set(existingBottleneck.data.map(d => d.route)))
          await fetchBottleneckForPanel(response.data, routes, existingBottleneck.statistic)
        }
      }
      else {
        await fetchMetricsForPanel(response.data)
      }

      return { success: true, panel: response.data }
    }
    catch (error: any) {
      console.error('Error updating panel time range:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to update time range'

      return { success: false, error: errorMessage }
    }
  }

  // --- Tabs state ---
  const tabs = ref<DashboardTab[]>(import.meta.client ? loadTabsFromStorage() : [])
  const activeTabId = ref<string>(
    import.meta.client ? (localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) ?? '') : '',
  )

  const activeTab = computed(() =>
    tabs.value.find(t => t.id === activeTabId.value) ?? tabs.value[0] ?? null,
  )

  const activePanels = computed(() => {
    if (!activeTab.value) return sortedPanels.value
    return activeTab.value.panelIds
      .map(id => panels.value.find(p => p.id === id))
      .filter((p): p is Panel => !!p)
  })

  function setActiveTab(tabId: string) {
    activeTabId.value = tabId
    if (import.meta.client) localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabId)
  }

  function addTab(name: string, templateId: string | null = null): DashboardTab {
    const tab: DashboardTab = {
      id: `tab-${Date.now()}`,
      name,
      templateId,
      panelIds: [],
    }
    tabs.value.push(tab)
    saveTabsToStorage(tabs.value)
    return tab
  }

  function renameTab(tabId: string, name: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.name = name
      saveTabsToStorage(tabs.value)
    }
  }

  function deleteTab(tabId: string) {
    tabs.value = tabs.value.filter(t => t.id !== tabId)
    saveTabsToStorage(tabs.value)
    if (activeTabId.value === tabId && tabs.value.length > 0) {
      setActiveTab(tabs.value[0]!.id)
    }
  }

  function reorderTabs(newOrder: string[]) {
    const tabMap = new Map(tabs.value.map(t => [t.id, t]))
    tabs.value = newOrder.map(id => tabMap.get(id)!).filter(Boolean)
    saveTabsToStorage(tabs.value)
  }

  function addPanelToTab(tabId: string, panelId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab && !tab.panelIds.includes(panelId)) {
      tab.panelIds.push(panelId)
      saveTabsToStorage(tabs.value)
    }
  }

  function removePanelFromTabs(panelId: string) {
    tabs.value.forEach((tab) => {
      tab.panelIds = tab.panelIds.filter(id => id !== panelId)
    })
    saveTabsToStorage(tabs.value)
  }

  // Run migration: if no tabs exist yet and we have panels, create "Default" tab
  function migrateToTabs() {
    if (!import.meta.client) return
    if (localStorage.getItem(TABS_VERSION_KEY)) return
    if (tabs.value.length > 0) {
      localStorage.setItem(TABS_VERSION_KEY, '1')
      return
    }
    if (panels.value.length > 0) {
      const defaultTab = addTab('Default', null)
      defaultTab.panelIds = panels.value.map(p => p.id)
      saveTabsToStorage(tabs.value)
      setActiveTab(defaultTab.id)
    }
    localStorage.setItem(TABS_VERSION_KEY, '1')
  }

  async function applyTemplate(templateId: string, projectId: string | number) {
    const { templates } = await import('~/dashboards/templates')
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    const tab = addTab(template.name, templateId)
    setActiveTab(tab.id)

    const created: Panel[] = []
    for (let i = 0; i < template.panels.length; i++) {
      const seed = template.panels[i]!
      const result = await createPanel({
        ...seed,
        project_id: String(projectId),
        index: i,
      } as CreatePanelRequest)
      if (result.success && result.panel) {
        created.push(result.panel)
        tab.panelIds.push(result.panel.id)
      }
    }

    saveTabsToStorage(tabs.value)
    return { tab, panels: created }
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
    getErrorsForPanel,
    isErrorsLoading,
    getErrorsHasMore,
    getErrorsOffset,
    addNewErrorToPanel,
    fetchLogsForPanel,
    getLogsForPanel,
    isLogsLoading,
    getLogsHasMore,
    getLogsOffset,
    fetchBottleneckForPanel,
    getBottleneckForPanel,
    isBottleneckLoading,
    fetchHeatmapForPanel,
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
    setActiveTab,
    addTab,
    renameTab,
    deleteTab,
    reorderTabs,
    addPanelToTab,
    removePanelFromTabs,
    migrateToTabs,
    applyTemplate,
  }
})
