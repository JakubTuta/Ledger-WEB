import type { ProjectQuotaResponse, UsageStatsDay, UsageStatsResponse } from '~/types/quota'
import { defineStore } from 'pinia'

function emptyQuota(projectId: number): ProjectQuotaResponse {
  return {
    project_id: projectId,
    project_name: '',
    project_slug: '',
    environment: '',
    logs: { quota: 0, usage: 0, remaining: 0 },
    spans: { quota: 0, usage: 0, remaining: 0 },
    metrics: { quota: 0, usage: 0, remaining: 0 },
    quota_reset_at: '',
    retention_days: 0,
  }
}

export const useQuotaStore = defineStore('quota', () => {
  const { client } = useApiStore()

  const quotasByProject = ref<Record<number, ProjectQuotaResponse>>({})
  const loadingStates = ref<Record<number, boolean>>({})
  const lastFetchTimes = ref<Record<number, Date>>({})

  const usageStatsByProject = ref<Record<number, UsageStatsDay[]>>({})
  const usageStatsLoadingStates = ref<Record<number, boolean>>({})
  const usageStatsLastFetchTimes = ref<Record<number, Date>>({})

  const getQuotaForProject = (projectId: number) => {
    return computed(() => quotasByProject.value[projectId] || emptyQuota(projectId))
  }

  const isLoadingForProject = (projectId: number) => {
    return computed(() => loadingStates.value[projectId] || false)
  }

  const hasDataForProject = (projectId: number) => {
    return computed(() => !!quotasByProject.value[projectId])
  }

  const fetchQuotaForProject = async (projectId: number, force = false) => {
    if (loadingStates.value[projectId])
      return

    if (!force && quotasByProject.value[projectId])
      return

    loadingStates.value[projectId] = true

    try {
      const response = await client.get<ProjectQuotaResponse>(`/api/v1/projects/${projectId}/quota`)

      quotasByProject.value[projectId] = response.data
      lastFetchTimes.value[projectId] = new Date()
    }
    catch (error) {
      console.error(`Error fetching quota for project ${projectId}:`, error)

      quotasByProject.value[projectId] = emptyQuota(projectId)
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

  const fetchUsageStatsForProject = async (projectId: number, force = false) => {
    if (usageStatsLoadingStates.value[projectId])
      return

    if (!force && usageStatsByProject.value[projectId])
      return

    usageStatsLoadingStates.value[projectId] = true

    try {
      const response = await client.get<UsageStatsResponse>(
        `/api/v1/projects/${projectId}/usage-stats`,
      )

      usageStatsByProject.value[projectId] = response.data.usage
      usageStatsLastFetchTimes.value[projectId] = new Date()
    }
    catch (error) {
      console.error(`Error fetching usage stats for project ${projectId}:`, error)

      usageStatsByProject.value[projectId] = []
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
    getQuotaForProject,
    isLoadingForProject,
    hasDataForProject,
    fetchQuotaForProject,
    refreshQuotaForProject,
    usageStatsByProject,
    usageStatsLoadingStates,
    usageStatsLastFetchTimes,
    getUsageStatsForProject,
    isLoadingUsageStatsForProject,
    hasUsageStatsForProject,
    fetchUsageStatsForProject,
    refreshUsageStatsForProject,
  }
})
