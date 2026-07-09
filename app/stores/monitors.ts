import type { CreateMonitorRequest, Monitor, UpdateMonitorRequest } from '~/types/monitors'
import { defineStore } from 'pinia'

export const useMonitorsStore = defineStore('monitors', () => {
  const { client } = useApiStore()

  const monitorsByProject = ref<Map<number, Monitor[]>>(new Map())
  const listLoading = ref<Set<number>>(new Set())
  const actionLoading = ref<Set<number>>(new Set())

  const getMonitorsForProject = (projectId: number) => monitorsByProject.value.get(projectId) ?? []
  const isListLoading = (projectId: number) => listLoading.value.has(projectId)
  const isActionLoading = (monitorId: number) => actionLoading.value.has(monitorId)

  const fetchMonitors = async (projectId: number) => {
    listLoading.value.add(projectId)
    try {
      const response = await client.get<Monitor[]>(`/api/v1/monitors?project_id=${projectId}`)
      monitorsByProject.value.set(projectId, response.data)

      return { success: true }
    }
    catch (error: any) {
      console.error('Error fetching monitors:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch monitors'

      return { success: false, error: errorMessage }
    }
    finally {
      listLoading.value.delete(projectId)
    }
  }

  const createMonitor = async (payload: CreateMonitorRequest) => {
    try {
      const response = await client.post<Monitor>('/api/v1/monitors', payload)
      const existing = getMonitorsForProject(payload.project_id)
      monitorsByProject.value.set(payload.project_id, [...existing, response.data])

      return { success: true, monitor: response.data }
    }
    catch (error: any) {
      console.error('Error creating monitor:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create monitor'

      return { success: false, error: errorMessage }
    }
  }

  const updateMonitor = async (projectId: number, monitorId: number, payload: UpdateMonitorRequest) => {
    actionLoading.value.add(monitorId)
    try {
      const response = await client.patch<Monitor>(
        `/api/v1/monitors/${monitorId}?project_id=${projectId}`,
        payload,
      )
      const list = getMonitorsForProject(projectId)
      const idx = list.findIndex(m => m.id === monitorId)
      if (idx !== -1)
        list.splice(idx, 1, response.data)

      return { success: true, monitor: response.data }
    }
    catch (error: any) {
      console.error('Error updating monitor:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update monitor'

      return { success: false, error: errorMessage }
    }
    finally {
      actionLoading.value.delete(monitorId)
    }
  }

  const deleteMonitor = async (projectId: number, monitorId: number) => {
    actionLoading.value.add(monitorId)
    try {
      await client.delete(`/api/v1/monitors/${monitorId}?project_id=${projectId}`)
      const list = getMonitorsForProject(projectId)
      monitorsByProject.value.set(projectId, list.filter(m => m.id !== monitorId))

      return { success: true }
    }
    catch (error: any) {
      console.error('Error deleting monitor:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete monitor'

      return { success: false, error: errorMessage }
    }
    finally {
      actionLoading.value.delete(monitorId)
    }
  }

  return {
    monitorsByProject,
    getMonitorsForProject,
    isListLoading,
    isActionLoading,
    fetchMonitors,
    createMonitor,
    updateMonitor,
    deleteMonitor,
  }
})
