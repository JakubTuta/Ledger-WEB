import type { AcceptInviteResponse, InviteCodeResponse, MembersListResponse, ProjectMember } from '~/types/sharing'
import { defineStore } from 'pinia'

export const useSharingStore = defineStore('sharing', () => {
  const { client } = useApiStore()

  const membersByProject = ref<Record<number, ProjectMember[]>>({})
  const loadingByProject = ref<Record<number, boolean>>({})
  const lastFetchByProject = ref<Record<number, Date>>({})

  const getMembersForProject = (projectId: number) => computed(() => membersByProject.value[projectId] ?? [])

  const isLoadingForProject = (projectId: number) => computed(() => loadingByProject.value[projectId] ?? false)

  const fetchMembers = async (projectId: number, force = false) => {
    if (loadingByProject.value[projectId])
      return

    if (!force && membersByProject.value[projectId])
      return

    loadingByProject.value[projectId] = true

    try {
      const response = await client.get<MembersListResponse>(`/api/v1/projects/${projectId}/members`)

      membersByProject.value[projectId] = response.data.members
      lastFetchByProject.value[projectId] = new Date()
    }
    catch (error) {
      console.error('Error fetching members:', error)
      throw error
    }
    finally {
      loadingByProject.value[projectId] = false
    }
  }

  const refreshMembers = async (projectId: number) => {
    await fetchMembers(projectId, true)
  }

  const generateInviteCode = async (projectId: number) => {
    try {
      const response = await client.post<InviteCodeResponse>(`/api/v1/projects/${projectId}/invite-code`)

      return { success: true, data: response.data }
    }
    catch (error: any) {
      console.error('Error generating invite code:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate invite code'

      return { success: false, error: errorMessage }
    }
  }

  const acceptInviteCode = async (code: string) => {
    try {
      const response = await client.post<AcceptInviteResponse>('/api/v1/invitations/accept', { code })

      const projectsStore = useProjectsStore()
      await projectsStore.refreshProjects()

      return { success: true, project: response.data }
    }
    catch (error: any) {
      console.error('Error accepting invite code:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to join project'

      return { success: false, error: errorMessage }
    }
  }

  const removeMember = async (projectId: number, accountId: number) => {
    try {
      await client.delete(`/api/v1/projects/${projectId}/members/${accountId}`)

      if (membersByProject.value[projectId]) {
        membersByProject.value[projectId] = membersByProject.value[projectId].filter(
          m => m.account_id !== accountId,
        )
      }

      return { success: true }
    }
    catch (error: any) {
      console.error('Error removing member:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove member'

      return { success: false, error: errorMessage }
    }
  }

  const leaveProject = async (projectId: number) => {
    try {
      await client.post(`/api/v1/projects/${projectId}/leave`)

      delete membersByProject.value[projectId]

      const projectsStore = useProjectsStore()
      await projectsStore.refreshProjects()

      return { success: true }
    }
    catch (error: any) {
      console.error('Error leaving project:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to leave project'

      return { success: false, error: errorMessage }
    }
  }

  return {
    membersByProject,
    loadingByProject,
    lastFetchByProject,
    getMembersForProject,
    isLoadingForProject,
    fetchMembers,
    refreshMembers,
    generateInviteCode,
    acceptInviteCode,
    removeMember,
    leaveProject,
  }
})
