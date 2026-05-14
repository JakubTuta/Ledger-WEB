import type { MetricTagInfo, TimeSeriesData } from '~/types/traces'
import { defineStore } from 'pinia'

export const useCustomMetricsStore = defineStore('customMetrics', () => {
  const { client } = useApiStore()

  const names = ref<string[]>([])
  const tagsByMetric = ref<Map<string, MetricTagInfo>>(new Map())
  const seriesByPanel = ref<Map<string | number, TimeSeriesData>>(new Map())
  const namesLoading = ref(false)
  const seriesLoading = ref<Set<string | number>>(new Set())

  let namesFetchDebounce: ReturnType<typeof setTimeout> | null = null

  const fetchNames = (prefix = '', force = false) => {
    if (namesFetchDebounce)
      clearTimeout(namesFetchDebounce)
    namesFetchDebounce = setTimeout(async () => {
      if (namesLoading.value && !force)
        return
      namesLoading.value = true
      try {
        const response = await client.get<{ names: string[] }>('/api/v1/metrics/custom/names', {
          params: { prefix },
        })
        names.value = response.data.names ?? []
      }
      catch (error) {
        console.error('Error fetching custom metric names:', error)
      }
      finally {
        namesLoading.value = false
      }
    }, 300)
  }

  const fetchTags = async (metricName: string, force = false) => {
    if (!force && tagsByMetric.value.has(metricName))
      return
    try {
      const response = await client.get<MetricTagInfo>('/api/v1/metrics/custom/tags', {
        params: { name: metricName },
      })
      tagsByMetric.value.set(metricName, response.data)
    }
    catch (error) {
      console.error('Error fetching custom metric tags:', error)
    }
  }

  const fetchSeries = async (
    panelId: string | number,
    config: {
      name: string
      tags?: Record<string, string>
      agg: string
      from: string
      to: string
      step?: string
    },
    force = false,
  ) => {
    if (seriesLoading.value.has(panelId) && !force)
      return
    seriesLoading.value.add(panelId)
    try {
      const params: Record<string, any> = {
        name: config.name,
        agg: config.agg,
        from: config.from,
        to: config.to,
      }
      if (config.step)
        params.step = config.step
      if (config.tags && Object.keys(config.tags).length > 0) {
        params.tags = JSON.stringify(config.tags)
      }

      const response = await client.get<TimeSeriesData>('/api/v1/metrics/custom', { params })
      seriesByPanel.value.set(panelId, response.data)
    }
    catch (error) {
      console.error('Error fetching custom metric series:', error)
    }
    finally {
      seriesLoading.value.delete(panelId)
    }
  }

  const getSeriesForPanel = (panelId: string | number) => computed(() => seriesByPanel.value.get(panelId) ?? null)

  const isLoadingPanel = (panelId: string | number) => computed(() => seriesLoading.value.has(panelId))

  return {
    names,
    namesLoading,
    tagsByMetric,
    fetchNames,
    fetchTags,
    fetchSeries,
    getSeriesForPanel,
    isLoadingPanel,
  }
})
