import type { ProjectQuotaResponse } from '~/types/quota'
import { defineStore } from 'pinia'

export const useQuotaStore = defineStore('quota', () => {
  const { client } = useApiStore()

  const quotasByProject = ref<Record<number, ProjectQuotaResponse>>({})
  const loadingStates = ref<Record<number, boolean>>({})
  const lastFetchTimes = ref<Record<number, Date>>({})

  const getQuotaForProject = (projectId: number) => {
    return computed(() => quotasByProject.value[projectId] || {
      project_id: projectId,
      project_name: '',
      project_slug: '',
      environment: '',
      daily_quota: 0,
      daily_usage: 0,
      quota_remaining: 0,
      quota_reset_at: '',
      retention_days: 0,
    } as ProjectQuotaResponse)
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

      quotasByProject.value[projectId] = {
        project_id: projectId,
        project_name: '',
        project_slug: '',
        environment: '',
        daily_quota: 0,
        daily_usage: 0,
        quota_remaining: 0,
        quota_reset_at: '',
        retention_days: 0,
      }
    }
    finally {
      loadingStates.value[projectId] = false
    }
  }

  const refreshQuotaForProject = async (projectId: number) => {
    await fetchQuotaForProject(projectId, true)
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
  }
})
