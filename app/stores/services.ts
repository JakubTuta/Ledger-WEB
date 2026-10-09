import type { Ref } from 'vue'
import type { Panel } from '~/types/panel'
import type { ServiceMapResponse, ServiceRedResponse } from '~/types/services'
import { defineStore } from 'pinia'
import { MAX_SERVICE_WINDOW_DAYS } from '~/types/services'
import { clampToRecentDays, resolvePanelTimeRange } from '~/utils/panelTimeRange'

/**
 * Span-derived views of a project's services: the dependency map and RED
 * (rate, errors, duration) per service or per operation of one service.
 */
export const useServicesStore = defineStore('services', () => {
  const { client } = useApiStore()

  const mapByPanel = ref<Map<string, ServiceMapResponse>>(new Map())
  const redByPanel = ref<Map<string, ServiceRedResponse>>(new Map())
  const loading = ref<Set<string>>(new Set())
  const errors = ref<Map<string, string>>(new Map())
  // The panel's range was longer than the endpoints accept and was cut.
  const clamped = ref<Set<string>>(new Set())

  function messageFor(error: any, fallback: string): string {
    return error?.response?.data?.detail || error?.message || fallback
  }

  function windowFor(panel: Panel): { from: string, to: string } {
    const range = clampToRecentDays(resolvePanelTimeRange(panel), MAX_SERVICE_WINDOW_DAYS)
    if (range.clamped)
      clamped.value.add(panel.id)
    else
      clamped.value.delete(panel.id)

    return { from: range.from, to: range.to }
  }

  async function load<T>(panel: Panel, target: Ref<Map<string, T>>, fetch: () => Promise<T>, fallback: string): Promise<boolean> {
    if (loading.value.has(panel.id))
      return false

    loading.value.add(panel.id)
    errors.value.delete(panel.id)
    try {
      target.value.set(panel.id, await fetch())

      return true
    }
    catch (error: any) {
      target.value.delete(panel.id)
      errors.value.set(panel.id, messageFor(error, fallback))

      return false
    }
    finally {
      loading.value.delete(panel.id)
    }
  }

  function fetchMapForPanel(panel: Panel): Promise<boolean> {
    return load(panel, mapByPanel, async () => {
      const response = await client.get<ServiceMapResponse>('/api/v1/services/map', {
        params: { project_id: panel.project_id, ...windowFor(panel) },
      })

      return response.data
    }, 'Could not load the service map')
  }

  function fetchRedForPanel(panel: Panel): Promise<boolean> {
    return load(panel, redByPanel, async () => {
      const params: Record<string, string> = { project_id: panel.project_id, ...windowFor(panel) }
      if (panel.service_filter)
        params.service = panel.service_filter
      const response = await client.get<ServiceRedResponse>('/api/v1/services/red', { params })

      return response.data
    }, 'Could not load service metrics')
  }

  const getMap = (panelId: string) => computed(() => mapByPanel.value.get(panelId))
  const getRed = (panelId: string) => computed(() => redByPanel.value.get(panelId))
  const isLoading = (panelId: string) => computed(() => loading.value.has(panelId))
  const getError = (panelId: string) => computed(() => errors.value.get(panelId) ?? '')
  const isClamped = (panelId: string) => computed(() => clamped.value.has(panelId))

  return {
    fetchMapForPanel,
    fetchRedForPanel,
    getMap,
    getRed,
    isLoading,
    getError,
    isClamped,
  }
})
