import type { ProjectQuotaResponse, UsageStatsDay, UsageStatsResponse } from '~/types/quota'
import { defineStore } from 'pinia'

function messageFor(error: any, fallback: string): string {
  return error?.response?.data?.detail || error?.message || fallback
}

export const useQuotaStore = defineStore('quota', () => {
  const { client } = useApiStore()

  const quotasByProject = ref<Record<number, ProjectQuotaResponse>>({})
  const loadingStates = ref<Record<number, boolean>>({})
  const lastFetchTimes = ref<Record<number, Date>>({})
  const errorsByProject = ref<Record<number, string | null>>({})

  const usageStatsByProject = ref<Record<number, UsageStatsDay[]>>({})
  const usageStatsLoadingStates = ref<Record<number, boolean>>({})
  const usageStatsLastFetchTimes = ref<Record<number, Date>>({})
  const usageStatsErrorsByProject = ref<Record<number, string | null>>({})

  const getQuotaForProject = (projectId: number) => {
    return computed(() => quotasByProject.value[projectId] ?? null)
  }

  const isLoadingForProject = (projectId: number) => {
    return computed(() => loadingStates.value[projectId] || false)
  }

  const hasDataForProject = (projectId: number) => {
    return computed(() => !!quotasByProject.value[projectId])
  }

  const getErrorForProject = (projectId: number) => {
    return computed(() => errorsByProject.value[projectId] ?? null)
  }

  const fetchQuotaForProject = async (projectId: number, force = false) => {
    if (loadingStates.value[projectId])
      return

    if (!force && quotasByProject.value[projectId])
      return

    loadingStates.value[projectId] = true
    errorsByProject.value[projectId] = null

    try {
      const response = await client.get<ProjectQuotaResponse>(`/api/v1/projects/${projectId}/quota`)

      quotasByProject.value[projectId] = response.data
      lastFetchTimes.value[projectId] = new Date()
    }
    catch (error: any) {
      console.error(`Error fetching quota for project ${projectId}:`, error)

      // Deliberately leaves any previously fetched quota in place and records
      // the failure instead of writing zeroed placeholders: a failed request
      // and a genuinely empty quota must not look the same to the user.
      errorsByProject.value[projectId] = messageFor(error, 'Failed to load quota usage')
    }
    finally {
      loadingStates.value[projectId] = false
    }
  }

  const refreshQuotaForProject = async (projectId: number) => {
    await fetchQuotaForProject(projectId, true)
  }

  const getUsageStatsForProject = (projectId: number) => {
    return computed(() => usageStatsByProject.value[projectId] || [])
  }

  const isLoadingUsageStatsForProject = (projectId: number) => {
    return computed(() => usageStatsLoadingStates.value[projectId] || false)
  }

  const hasUsageStatsForProject = (projectId: number) => {
    return computed(() => !!usageStatsByProject.value[projectId])
  }

  const getUsageStatsErrorForProject = (projectId: number) => {
    return computed(() => usageStatsErrorsByProject.value[projectId] ?? null)
  }

  const fetchUsageStatsForProject = async (projectId: number, force = false) => {
    if (usageStatsLoadingStates.value[projectId])
      return

    if (!force && usageStatsByProject.value[projectId])
      return

    usageStatsLoadingStates.value[projectId] = true
    usageStatsErrorsByProject.value[projectId] = null

    try {
      const response = await client.get<UsageStatsResponse>(
        `/api/v1/projects/${projectId}/usage-stats`,
      )

      usageStatsByProject.value[projectId] = response.data.usage
      usageStatsLastFetchTimes.value[projectId] = new Date()
    }
    catch (error: any) {
      console.error(`Error fetching usage stats for project ${projectId}:`, error)

      usageStatsErrorsByProject.value[projectId] = messageFor(error, 'Failed to load usage history')
    }
    finally {
      usageStatsLoadingStates.value[projectId] = false
    }
  }

  const refreshUsageStatsForProject = async (projectId: number) => {
    await fetchUsageStatsForProject(projectId, true)
  }

  return {
    quotasByProject,
    loadingStates,
    lastFetchTimes,
    errorsByProject,
    getQuotaForProject,
    isLoadingForProject,
    hasDataForProject,
    getErrorForProject,
    fetchQuotaForProject,
    refreshQuotaForProject,
    usageStatsByProject,
    usageStatsLoadingStates,
    usageStatsLastFetchTimes,
    usageStatsErrorsByProject,
    getUsageStatsForProject,
    isLoadingUsageStatsForProject,
    hasUsageStatsForProject,
    getUsageStatsErrorForProject,
    fetchUsageStatsForProject,
    refreshUsageStatsForProject,
  }
})
