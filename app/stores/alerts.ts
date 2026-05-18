import type {
  AlertEvent,
  AlertEventListResponse,
  AlertRule,
  Connector,
  CreateAlertRuleRequest,
  CreateConnectorRequest,
  UpdateAlertRuleRequest,
  UpdateConnectorRequest,
} from '~/types/alerts'
import { defineStore } from 'pinia'

export const useAlertsStore = defineStore('alerts', () => {
  const { client } = useApiStore()

  // --- Connectors (account-wide) ---

  const connectors = ref<Connector[]>([])
  const connectorsLoading = ref(false)
  const connectorsLastFetch = ref<number | null>(null)
  const hasConnectors = computed(() => connectors.value.length > 0)

  const fetchConnectors = async (force = false) => {
    if (connectorsLoading.value)
      return
    if (!force && connectorsLastFetch.value)
      return

    connectorsLoading.value = true
    try {
      const response = await client.get<Connector[]>('/api/v1/connectors')
      connectors.value = response.data
      connectorsLastFetch.value = Date.now()
    }
    catch (error) {
      console.error('Error fetching connectors:', error)
    }
    finally {
      connectorsLoading.value = false
    }
  }

  const refreshConnectors = () => fetchConnectors(true)

  const createConnector = async (data: CreateConnectorRequest) => {
    try {
      const response = await client.post<Connector>('/api/v1/connectors', data)
      connectors.value = [...connectors.value, response.data]

      return { success: true, connector: response.data }
    }
    catch (error: any) {
      return { success: false, error: error.response?.data?.message ?? 'Failed to create connector' }
    }
  }

  const updateConnector = async (id: number, data: UpdateConnectorRequest) => {
    try {
      const response = await client.patch<Connector>(`/api/v1/connectors/${id}`, data)
      connectors.value = connectors.value.map(c => (c.id === id
        ? response.data
        : c))

      return { success: true, connector: response.data }
    }
    catch (error: any) {
      return { success: false, error: error.response?.data?.message ?? 'Failed to update connector' }
    }
  }

  const deleteConnector = async (id: number) => {
    await client.delete(`/api/v1/connectors/${id}`)
    connectors.value = connectors.value.filter(c => c.id !== id)
  }

  const testConnector = async (id: number) => {
    try {
      await client.post(`/api/v1/connectors/${id}/test`)

      return { success: true }
    }
    catch (error: any) {
      return { success: false, error: error.response?.data?.message ?? 'Test failed' }
    }
  }

  // --- Rules (per project) ---

  const rulesByProject = ref<Map<number, AlertRule[]>>(new Map())
  const rulesLoading = ref<Set<number>>(new Set())

  const getRulesForProject = (projectId: number) => computed(() => rulesByProject.value.get(projectId) ?? [])

  const fetchRules = async (projectId: number, force = false) => {
    if (rulesLoading.value.has(projectId))
      return
    if (!force && rulesByProject.value.has(projectId))
      return

    rulesLoading.value.add(projectId)
    try {
      const response = await client.get<AlertRule[]>('/api/v1/alerts/rules', {
        params: { project_id: projectId },
      })
      rulesByProject.value.set(projectId, response.data)
    }
    catch (error) {
      console.error('Error fetching alert rules:', error)
    }
    finally {
      rulesLoading.value.delete(projectId)
    }
  }

  const createRule = async (data: CreateAlertRuleRequest) => {
    try {
      const response = await client.post<AlertRule>('/api/v1/alerts/rules', data)
      const rules = rulesByProject.value.get(data.project_id) ?? []
      rulesByProject.value.set(data.project_id, [...rules, response.data])

      return { success: true, rule: response.data }
    }
    catch (error: any) {
      return { success: false, error: error.response?.data?.message ?? 'Failed to create rule' }
    }
  }

  const updateRule = async (id: number, projectId: number, data: UpdateAlertRuleRequest) => {
    try {
      const response = await client.patch<AlertRule>(`/api/v1/alerts/rules/${id}`, data, {
        params: { project_id: projectId },
      })
      const rules = rulesByProject.value.get(projectId) ?? []
      rulesByProject.value.set(projectId, rules.map(r => (r.id === id
        ? response.data
        : r)))

      return { success: true, rule: response.data }
    }
    catch (error: any) {
      return { success: false, error: error.response?.data?.message ?? 'Failed to update rule' }
    }
  }

  const deleteRule = async (id: number, projectId: number) => {
    await client.delete(`/api/v1/alerts/rules/${id}`, {
      params: { project_id: projectId },
    })
    const rules = rulesByProject.value.get(projectId) ?? []
    rulesByProject.value.set(projectId, rules.filter(r => r.id !== id))
  }

  const toggleRule = (id: number, projectId: number, enabled: boolean) => {
    return updateRule(id, projectId, { enabled })
  }

  // --- History (per project, cursor paginated) ---

  const historyByProject = ref<Map<number, AlertEvent[]>>(new Map())
  const historyLoading = ref<Set<number>>(new Set())
  const historyHasMore = ref<Map<number, boolean>>(new Map())

  const getHistoryForProject = (projectId: number) => computed(() => historyByProject.value.get(projectId) ?? [])

  const fetchHistory = async (projectId: number, opts: { append?: boolean } = {}) => {
    if (historyLoading.value.has(projectId))
      return

    const current = historyByProject.value.get(projectId) ?? []
    const beforeId = opts.append && current.length > 0
      ? current[current.length - 1]!.id
      : undefined

    historyLoading.value.add(projectId)
    try {
      const response = await client.get<AlertEventListResponse>('/api/v1/alerts/history', {
        params: { project_id: projectId, limit: 25, before_id: beforeId },
      })
      const next = opts.append
        ? [...current, ...response.data.events]
        : response.data.events
      historyByProject.value.set(projectId, next)
      historyHasMore.value.set(projectId, response.data.has_more)
    }
    catch (error) {
      console.error('Error fetching alert history:', error)
    }
    finally {
      historyLoading.value.delete(projectId)
    }
  }

  return {
    connectors,
    connectorsLoading,
    hasConnectors,
    fetchConnectors,
    refreshConnectors,
    createConnector,
    updateConnector,
    deleteConnector,
    testConnector,
    rulesByProject,
    rulesLoading,
    getRulesForProject,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    historyByProject,
    historyLoading,
    historyHasMore,
    getHistoryForProject,
    fetchHistory,
  }
})
