import type { HealthSummaryResponse, ProjectHealthSummary } from '~/types/health'
import type { TimeRangePreset } from '~/types/panel'
import { defineStore } from 'pinia'

export const useHealthStore = defineStore('health', () => {
  const { client } = useApiStore()

  const summaries = ref<Map<string, ProjectHealthSummary>>(new Map())
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)
  const error = ref<string | null>(null)
  const hasData = computed(() => summaries.value.size > 0)

  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let lastRequest: { projectIds: string[], period: TimeRangePreset } | null = null

  const fetchHealthSummary = async (projectIds: string[], period: TimeRangePreset = 'today') => {
    if (isLoading.value || projectIds.length === 0)
      return

    isLoading.value = true
    error.value = null
    lastRequest = { projectIds, period }

    try {
      const params = new URLSearchParams()
      projectIds.forEach(id => params.append('project_ids', id))
      params.set('period', period)

      const response = await client.get<HealthSummaryResponse>(
        `/api/v1/dashboard/health-summary?${params.toString()}`,
      )

      const next = new Map<string, ProjectHealthSummary>()
      for (const s of response.data.summaries) {
        next.set(s.project_id, s)
      }
      summaries.value = next
      lastFetchTime.value = new Date()
    }
    catch (err: any) {
      console.error('Error fetching health summary:', err)

      // Any previously fetched summaries stay visible, but the failure is
      // recorded so the strip can tell "request failed" apart from "no
      // health data for these projects".
      error.value = err?.response?.data?.detail || err?.message || 'Failed to load project health'
    }
    finally {
      isLoading.value = false
    }
  }

  const refresh = async () => {
    if (!lastRequest)
      return
    await fetchHealthSummary(lastRequest.projectIds, lastRequest.period)
  }

  const getSummaryForProject = (projectId: string) => summaries.value.get(projectId)

  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  const startAutoRefresh = (projectIds: string[], period: TimeRangePreset = 'today') => {
    stopAutoRefresh()
    refreshTimer = setInterval(() => {
      fetchHealthSummary(projectIds, period)
    }, 60_000)
  }

  return {
    summaries,
    isLoading,
    lastFetchTime,
    error,
    hasData,
    fetchHealthSummary,
    refresh,
    getSummaryForProject,
    startAutoRefresh,
    stopAutoRefresh,
  }
})
