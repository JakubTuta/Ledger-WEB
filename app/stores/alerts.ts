import type {
  AlertChannel,
  AlertRule,
  ChannelTestResult,
  CreateAlertChannelRequest,
  CreateAlertRuleRequest,
  UpdateAlertChannelRequest,
  UpdateAlertRuleRequest,
} from '~/types/alerts'
import { defineStore } from 'pinia'

export const useAlertsStore = defineStore('alerts', () => {
  const { client } = useApiStore()

  const rulesByProject = ref<Map<number, AlertRule[]>>(new Map())
  const channelsByProject = ref<Map<number, AlertChannel[]>>(new Map())
  const rulesLoading = ref<Set<number>>(new Set())
  const channelsLoading = ref<Set<number>>(new Set())

  // --- Rules ---

  const getRulesForProject = (projectId: number) =>
    computed(() => rulesByProject.value.get(projectId) ?? [])

  const fetchRules = async (projectId: number, force = false) => {
    if (rulesLoading.value.has(projectId)) return
    if (!force && rulesByProject.value.has(projectId)) return

    rulesLoading.value.add(projectId)
    try {
      const response = await client.get('/api/v1/alerts/rules', {
        params: { project_id: projectId },
      })
      const rules: AlertRule[] = response.data.rules ?? response.data
      rulesByProject.value.set(projectId, rules)
    }
    catch (error) {
      console.error('Error fetching alert rules:', error)
    }
    finally {
      rulesLoading.value.delete(projectId)
    }
  }

  const createRule = async (data: CreateAlertRuleRequest) => {
    const response = await client.post<AlertRule>('/api/v1/alerts/rules', data)
    const rules = rulesByProject.value.get(data.project_id) ?? []
    rulesByProject.value.set(data.project_id, [...rules, response.data])
    return response.data
  }

  const updateRule = async (id: number, projectId: number, data: UpdateAlertRuleRequest) => {
    const response = await client.patch<AlertRule>(`/api/v1/alerts/rules/${id}`, data, {
      params: { project_id: projectId },
    })
    const rules = rulesByProject.value.get(projectId) ?? []
    rulesByProject.value.set(
      projectId,
      rules.map(r => (r.id === id ? response.data : r)),
    )
    return response.data
  }

  const deleteRule = async (id: number, projectId: number) => {
    await client.delete(`/api/v1/alerts/rules/${id}`, {
      params: { project_id: projectId },
    })
    const rules = rulesByProject.value.get(projectId) ?? []
    rulesByProject.value.set(projectId, rules.filter(r => r.id !== id))
  }

  const toggleRule = async (id: number, projectId: number, enabled: boolean) => {
    return updateRule(id, projectId, { enabled })
  }

  // --- Channels ---

  const getChannelsForProject = (projectId: number) =>
    computed(() => channelsByProject.value.get(projectId) ?? [])

  const fetchChannels = async (projectId: number, force = false) => {
    if (channelsLoading.value.has(projectId)) return
    if (!force && channelsByProject.value.has(projectId)) return

    channelsLoading.value.add(projectId)
    try {
      const response = await client.get('/api/v1/alerts/channels', {
        params: { project_id: projectId },
      })
      const channels: AlertChannel[] = response.data.channels ?? response.data
      channelsByProject.value.set(projectId, channels)
    }
    catch (error) {
      console.error('Error fetching alert channels:', error)
    }
    finally {
      channelsLoading.value.delete(projectId)
    }
  }

  const createChannel = async (data: CreateAlertChannelRequest) => {
    const response = await client.post<AlertChannel>('/api/v1/alerts/channels', data)
    const channels = channelsByProject.value.get(data.project_id) ?? []
    channelsByProject.value.set(data.project_id, [...channels, response.data])
    return response.data
  }

  const updateChannel = async (id: number, projectId: number, data: UpdateAlertChannelRequest) => {
    const response = await client.patch<AlertChannel>(`/api/v1/alerts/channels/${id}`, data, {
      params: { project_id: projectId },
    })
    const channels = channelsByProject.value.get(projectId) ?? []
    channelsByProject.value.set(
      projectId,
      channels.map(c => (c.id === id ? response.data : c)),
    )
    return response.data
  }

  const deleteChannel = async (id: number, projectId: number) => {
    await client.delete(`/api/v1/alerts/channels/${id}`, {
      params: { project_id: projectId },
    })
    const channels = channelsByProject.value.get(projectId) ?? []
    channelsByProject.value.set(projectId, channels.filter(c => c.id !== id))
  }

  const testChannel = async (id: number): Promise<ChannelTestResult> => {
    try {
      const response = await client.post<ChannelTestResult>(`/api/v1/alerts/channels/${id}/test`)
      return response.data
    }
    catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message ?? 'Test failed',
      }
    }
  }

  return {
    rulesByProject,
    channelsByProject,
    rulesLoading,
    channelsLoading,
    getRulesForProject,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    getChannelsForProject,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    testChannel,
  }
})
