import type {
  AggregatedMetricsResponse,
  CreatePanelRequest,
  MetricsQueryParams,
  Panel,
  PanelListResponse,
  TimeRangePreset,
  UpdatePanelRequest,
} from '~/types/panel'
import { defineStore } from 'pinia'

export const usePanelsStore = defineStore('panels', () => {
  const apiStore = useApiStore()
  const { client } = storeToRefs(apiStore)

  const panels = ref<Panel[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)
  const hasData = computed(() => panels.value.length > 0)

  const panelMetrics = ref<Map<number, AggregatedMetricsResponse>>(new Map())
  const metricsLoading = ref<Set<number>>(new Set())

  const panelErrors = ref<Map<number, any[]>>(new Map())
  const errorsLoading = ref<Set<number>>(new Set())
  const errorsOffset = ref<Map<number, number>>(new Map())
  const errorsHasMore = ref<Map<number, boolean>>(new Map())

  const panelLogs = ref<Map<number, any[]>>(new Map())
  const logsLoading = ref<Set<number>>(new Set())
  const logsOffset = ref<Map<number, number>>(new Map())
  const logsHasMore = ref<Map<number, boolean>>(new Map())

  const sortedPanels = computed(() => [...panels.value].sort((a, b) => a.index - b.index),
  )

  const fetchPanels = async (force = false) => {
    if (isLoading.value)
      return

    if (!force && hasData.value)
      return

    isLoading.value = true

    try {
      const response = await client.value.get<PanelListResponse>('/api/v1/dashboard/panels')

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

      const response = await client.value.get<AggregatedMetricsResponse>(
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

  const getMetricsForPanel = (panelId: number) => {
    return panelMetrics.value.get(panelId)
  }

  const isMetricsLoading = (panelId: number) => {
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

      const response = await client.value.get<any>(
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

  const getErrorsForPanel = (panelId: number) => {
    return panelErrors.value.get(panelId) || []
  }

  const isErrorsLoading = (panelId: number) => {
    return errorsLoading.value.has(panelId)
  }

  const getErrorsHasMore = (panelId: number) => {
    return errorsHasMore.value.get(panelId) || false
  }

  const getErrorsOffset = (panelId: number) => {
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

      const response = await client.value.get<any>(
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

  const getLogsForPanel = (panelId: number) => {
    return panelLogs.value.get(panelId) || []
  }

  const isLogsLoading = (panelId: number) => {
    return logsLoading.value.has(panelId)
  }

  const getLogsHasMore = (panelId: number) => {
    return logsHasMore.value.get(panelId) || false
  }

  const getLogsOffset = (panelId: number) => {
    return logsOffset.value.get(panelId) || 0
  }

  const createPanel = async (data: CreatePanelRequest) => {
    try {
      const response = await client.value.post<Panel>('/api/v1/dashboard/panels', data)

      panels.value.push(response.data)
      total.value += 1

      return { success: true, panel: response.data }
    }
    catch (error: any) {
      console.error('Error creating panel:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to create panel'

      return { success: false, error: errorMessage }
    }
  }

  const updatePanel = async (panelId: number, data: Partial<UpdatePanelRequest>) => {
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

      const response = await client.value.put<Panel>(`/api/v1/dashboard/panels/${panelId}`, updateData)

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

  const deletePanel = async (panelId: number) => {
    try {
      await client.value.delete(`/api/v1/dashboard/panels/${panelId}`)

      panels.value = panels.value.filter(p => p.id !== panelId)
      total.value -= 1
      panelMetrics.value.delete(panelId)
      panelErrors.value.delete(panelId)
      errorsOffset.value.delete(panelId)
      errorsHasMore.value.delete(panelId)
      panelLogs.value.delete(panelId)
      logsOffset.value.delete(panelId)
      logsHasMore.value.delete(panelId)

      return { success: true }
    }
    catch (error: any) {
      console.error('Error deleting panel:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete panel'

      return { success: false, error: errorMessage }
    }
  }

  const updatePanelIndexes = async (updatedPanels: { id: number, index: number }[]) => {
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
            period: panel.period || null,
            periodFrom: panel.periodFrom || null,
            periodTo: panel.periodTo || null,
          }

          return client.value.put(`/api/v1/dashboard/panels/${id}`, updateData)
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
    panelId: number,
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

      const response = await client.value.put<Panel>(`/api/v1/dashboard/panels/${panelId}`, updateData)

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
    createPanel,
    updatePanel,
    deletePanel,
    updatePanelIndexes,
    updatePanelTimeRange,
  }
})
