import type {
  AssignErrorGroupRequest,
  ErrorGroup,
  ErrorGroupDetail,
  ErrorGroupListResponse,
  ErrorGroupStatus,
  UpdateErrorGroupStatusRequest,
} from '~/types/errorGroups'
import { defineStore } from 'pinia'

export const useErrorsStore = defineStore('errors', () => {
  const { client } = useApiStore()

  const groupsByProject = ref<Map<number, ErrorGroup[]>>(new Map())
  const totalByProject = ref<Map<number, number>>(new Map())
  const hasMoreByProject = ref<Map<number, boolean>>(new Map())
  const listLoading = ref<Set<number>>(new Set())

  const detailById = ref<Map<number, ErrorGroupDetail>>(new Map())
  const detailLoading = ref<Set<number>>(new Set())

  const actionLoading = ref<Set<number>>(new Set())

  const getGroupsForProject = (projectId: number) => groupsByProject.value.get(projectId) ?? []
  const getTotalForProject = (projectId: number) => totalByProject.value.get(projectId) ?? 0
  const getHasMoreForProject = (projectId: number) => hasMoreByProject.value.get(projectId) ?? false
  const isListLoading = (projectId: number) => listLoading.value.has(projectId)
  const getDetail = (groupId: number) => detailById.value.get(groupId)
  const isDetailLoading = (groupId: number) => detailLoading.value.has(groupId)
  const isActionLoading = (groupId: number) => actionLoading.value.has(groupId)

  const fetchErrorGroups = async (
    projectId: number,
    opts?: { status?: ErrorGroupStatus | null, append?: boolean, limit?: number },
  ) => {
    if (listLoading.value.has(projectId))
      return

    listLoading.value.add(projectId)

    const limit = opts?.limit ?? 50
    const offset = opts?.append
      ? getGroupsForProject(projectId).length
      : 0

    try {
      const params = new URLSearchParams()
      params.set('project_id', String(projectId))
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (opts?.status)
        params.set('status', opts.status)

      const response = await client.get<ErrorGroupListResponse>(
        `/api/v1/error-groups?${params.toString()}`,
      )

      const existing = opts?.append
        ? getGroupsForProject(projectId)
        : []
      groupsByProject.value.set(projectId, [...existing, ...response.data.groups])
      totalByProject.value.set(projectId, response.data.total)
      hasMoreByProject.value.set(projectId, response.data.has_more)

      return { success: true }
    }
    catch (error: any) {
      console.error('Error fetching error groups:', error)
      if (!opts?.append) {
        groupsByProject.value.set(projectId, [])
        hasMoreByProject.value.set(projectId, false)
      }

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch error groups'

      return { success: false, error: errorMessage }
    }
    finally {
      listLoading.value.delete(projectId)
    }
  }

  const fetchErrorGroupDetail = async (projectId: number, groupId: number) => {
    if (detailLoading.value.has(groupId))
      return

    detailLoading.value.add(groupId)

    try {
      const response = await client.get<ErrorGroupDetail>(
        `/api/v1/error-groups/${groupId}?project_id=${projectId}`,
      )

      detailById.value.set(groupId, response.data)

      return { success: true, detail: response.data }
    }
    catch (error: any) {
      console.error('Error fetching error group detail:', error)

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch error group'

      return { success: false, error: errorMessage }
    }
    finally {
      detailLoading.value.delete(groupId)
    }
  }

  function _patchGroupEverywhere(projectId: number, updated: ErrorGroup) {
    const list = groupsByProject.value.get(projectId)
    if (list) {
      const idx = list.findIndex(g => g.id === updated.id)
      if (idx !== -1)
        list.splice(idx, 1, updated)
    }

    const detail = detailById.value.get(updated.id)
    if (detail)
      detailById.value.set(updated.id, { ...detail, group: updated })
  }

  const updateErrorGroupStatus = async (
    projectId: number,
    groupId: number,
    payload: UpdateErrorGroupStatusRequest,
  ) => {
    actionLoading.value.add(groupId)

    try {
      const response = await client.patch<ErrorGroup>(
        `/api/v1/error-groups/${groupId}/status?project_id=${projectId}`,
        payload,
      )

      _patchGroupEverywhere(projectId, response.data)

      return { success: true, group: response.data }
    }
    catch (error: any) {
      console.error('Error updating error group status:', error)

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update status'

      return { success: false, error: errorMessage }
    }
    finally {
      actionLoading.value.delete(groupId)
    }
  }

  const assignErrorGroup = async (
    projectId: number,
    groupId: number,
    payload: AssignErrorGroupRequest,
  ) => {
    actionLoading.value.add(groupId)

    try {
      const response = await client.patch<ErrorGroup>(
        `/api/v1/error-groups/${groupId}/assign?project_id=${projectId}`,
        payload,
      )

      _patchGroupEverywhere(projectId, response.data)

      return { success: true, group: response.data }
    }
    catch (error: any) {
      console.error('Error assigning error group:', error)

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to assign error group'

      return { success: false, error: errorMessage }
    }
    finally {
      actionLoading.value.delete(groupId)
    }
  }

  return {
    groupsByProject,
    totalByProject,
    hasMoreByProject,
    getGroupsForProject,
    getTotalForProject,
    getHasMoreForProject,
    isListLoading,
    fetchErrorGroups,
    detailById,
    getDetail,
    isDetailLoading,
    fetchErrorGroupDetail,
    isActionLoading,
    updateErrorGroupStatus,
    assignErrorGroup,
  }
})
