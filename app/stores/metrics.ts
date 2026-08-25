import type {
  MetricName,
  MetricNamesResponse,
  MetricSeriesQuery,
  MetricSeriesResponse,
  MetricTagKey,
  MetricTagsResponse,
} from '~/types/metrics'
import { defineStore } from 'pinia'

/**
 * Read side of custom metrics - the counters, gauges and histograms an
 * application emits through the SDK's metric_* helpers or any OpenTelemetry
 * exporter. Distinct from the log-derived endpoint metrics the panels store
 * serves.
 */
export const useMetricsStore = defineStore('metrics', () => {
  const { client } = useApiStore()

  const namesByProject = ref<Map<string, MetricName[]>>(new Map())
  const namesLoading = ref<Set<string>>(new Set())
  const namesError = ref<Map<string, string>>(new Map())

  const tagsByMetric = ref<Map<string, MetricTagKey[]>>(new Map())
  const tagsLoading = ref<Set<string>>(new Set())
  const tagsError = ref<Map<string, string>>(new Map())

  const seriesByPanel = ref<Map<string, MetricSeriesResponse>>(new Map())
  const seriesLoading = ref<Set<string>>(new Set())
  const seriesError = ref<Map<string, string>>(new Map())

  function messageFor(error: any, fallback: string): string {
    return error?.response?.data?.detail || error?.message || fallback
  }

  function tagCacheKey(projectId: string | number, name: string): string {
    return `${projectId}:${name}`
  }

  const getNames = (projectId: string | number) => computed(() => namesByProject.value.get(String(projectId)) ?? [])
  const isNamesLoading = (projectId: string | number) => computed(() => namesLoading.value.has(String(projectId)))
  const getNamesError = (projectId: string | number) => computed(() => namesError.value.get(String(projectId)) ?? '')

  const getTags = (projectId: string | number, name: string) => computed(() => tagsByMetric.value.get(tagCacheKey(projectId, name)) ?? [])
  const isTagsLoading = (projectId: string | number, name: string) => computed(() => tagsLoading.value.has(tagCacheKey(projectId, name)))
  const getTagsError = (projectId: string | number, name: string) => computed(() => tagsError.value.get(tagCacheKey(projectId, name)) ?? '')

  const getSeries = (panelId: string) => computed(() => seriesByPanel.value.get(panelId))
  const isSeriesLoading = (panelId: string) => computed(() => seriesLoading.value.has(panelId))
  const getSeriesError = (panelId: string) => computed(() => seriesError.value.get(panelId) ?? '')

  async function fetchNames(projectId: string | number, force = false): Promise<boolean> {
    const key = String(projectId)

    if (namesLoading.value.has(key))
      return false
    if (!force && namesByProject.value.has(key))
      return true

    namesLoading.value.add(key)
    namesError.value.delete(key)

    try {
      const response = await client.get<MetricNamesResponse>('/api/v1/metrics/names', {
        params: { project_id: projectId },
      })
      namesByProject.value.set(key, response.data.metrics ?? [])

      return true
    }
    catch (error: any) {
      namesError.value.set(key, messageFor(error, 'Could not load metric names'))

      return false
    }
    finally {
      namesLoading.value.delete(key)
    }
  }

  async function fetchTags(projectId: string | number, name: string, force = false): Promise<boolean> {
    const key = tagCacheKey(projectId, name)

    if (tagsLoading.value.has(key))
      return false
    if (!force && tagsByMetric.value.has(key))
      return true

    tagsLoading.value.add(key)
    tagsError.value.delete(key)

    try {
      const response = await client.get<MetricTagsResponse>(`/api/v1/metrics/${encodeURIComponent(name)}/tags`, {
        params: { project_id: projectId },
      })
      tagsByMetric.value.set(key, response.data.keys ?? [])

      return true
    }
    catch (error: any) {
      tagsError.value.set(key, messageFor(error, 'Could not load metric tags'))

      return false
    }
    finally {
      tagsLoading.value.delete(key)
    }
  }

  async function fetchSeries(panelId: string, query: MetricSeriesQuery, force = false): Promise<boolean> {
    if (seriesLoading.value.has(panelId) && !force)
      return false

    seriesLoading.value.add(panelId)
    seriesError.value.delete(panelId)

    try {
      const params: Record<string, any> = { project_id: query.project_id }

      if (query.aggregation)
        params.aggregation = query.aggregation
      if (query.group_by?.length)
        params.group_by = query.group_by
      if (query.interval)
        params.interval = query.interval
      if (query.from)
        params.from = query.from
      if (query.to)
        params.to = query.to

      const tagFilters = query.tag_filters ?? {}
      const tagEntries = Object.entries(tagFilters)
      if (tagEntries.length)
        params.tag = tagEntries.map(([key, value]) => `${key}=${value}`)

      const response = await client.get<MetricSeriesResponse>(
        `/api/v1/metrics/${encodeURIComponent(query.name)}/series`,
        { params },
      )
      seriesByPanel.value.set(panelId, response.data)

      return true
    }
    catch (error: any) {
      seriesByPanel.value.delete(panelId)
      seriesError.value.set(panelId, messageFor(error, 'Could not load metric data'))

      return false
    }
    finally {
      seriesLoading.value.delete(panelId)
    }
  }

  function clearPanel(panelId: string): void {
    seriesByPanel.value.delete(panelId)
    seriesError.value.delete(panelId)
  }

  return {
    getNames,
    isNamesLoading,
    getNamesError,
    getTags,
    isTagsLoading,
    getTagsError,
    getSeries,
    isSeriesLoading,
    getSeriesError,
    fetchNames,
    fetchTags,
    fetchSeries,
    clearPanel,
  }
})
