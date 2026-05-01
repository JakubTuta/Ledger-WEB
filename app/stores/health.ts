import { defineStore } from 'pinia'
import type { HealthSummaryResponse, ProjectHealthSummary } from '~/types/health'
import type { TimeRangePreset } from '~/types/panel'

export const useHealthStore = defineStore('health', () => {
  const { client } = useApiStore()

  const summaries = ref<Map<string, ProjectHealthSummary>>(new Map())
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  const fetchHealthSummary = async (projectIds: string[], period: TimeRangePreset = 'today') => {
    if (isLoading.value || projectIds.length === 0) return

    isLoading.value = true

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
    catch (error) {
      console.error('Error fetching health summary:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  const getSummaryForProject = (projectId: string) => summaries.value.get(projectId)

  const startAutoRefresh = (projectIds: string[], period: TimeRangePreset = 'today') => {
    stopAutoRefresh()
    refreshTimer = setInterval(() => {
      fetchHealthSummary(projectIds, period)
    }, 60_000)
  }

  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  return {
    summaries,
    isLoading,
    lastFetchTime,
    fetchHealthSummary,
    getSummaryForProject,
    startAutoRefresh,
    stopAutoRefresh,
  }
})
