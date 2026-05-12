import type { Span, TraceDetailResponse, TraceListFilters, TraceListResponse, TraceSummary } from '~/types/traces'
import { defineStore } from 'pinia'

export const useTracesStore = defineStore('traces', () => {
  const { client } = useApiStore()

  const listsByPanel = ref<Map<string | number, TraceSummary[]>>(new Map())
  const detailsById = ref<Map<string, Span[]>>(new Map())
  const listLoading = ref<Set<string | number>>(new Set())
  const detailLoading = ref<Set<string>>(new Set())

  const fetchList = async (panelId: string | number, filters: TraceListFilters, force = false) => {
    if (listLoading.value.has(panelId) && !force) return
    listLoading.value.add(panelId)
    try {
      const params: Record<string, any> = { limit: filters.limit ?? 50 }
      if (filters.project_id) params.project_id = filters.project_id
      if (filters.service) params.service = filters.service
      if (filters.operation) params.operation = filters.operation
      if (filters.min_duration_ms) params.min_duration_ms = filters.min_duration_ms
      if (filters.has_error !== undefined) params.has_error = filters.has_error
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      if (filters.offset) params.offset = filters.offset

      const response = await client.get<TraceListResponse>('/api/v1/traces', { params })
      listsByPanel.value.set(panelId, response.data.traces ?? [])
    }
    catch (error) {
      console.error('Error fetching trace list:', error)
    }
    finally {
      listLoading.value.delete(panelId)
    }
  }

  const fetchDetail = async (traceId: string, force = false) => {
    if (detailLoading.value.has(traceId) && !force) return
    if (!force && detailsById.value.has(traceId)) return
    detailLoading.value.add(traceId)
    try {
      const response = await client.get<TraceDetailResponse>(`/api/v1/traces/${traceId}`)
      detailsById.value.set(traceId, response.data.spans ?? [])
    }
    catch (error) {
      console.error('Error fetching trace detail:', error)
    }
    finally {
      detailLoading.value.delete(traceId)
    }
  }

  const getListForPanel = (panelId: string | number) =>
    computed(() => listsByPanel.value.get(panelId) ?? [])

  const getSpansForTrace = (traceId: string) =>
    computed(() => detailsById.value.get(traceId) ?? [])

  const isListLoading = (panelId: string | number) =>
    computed(() => listLoading.value.has(panelId))

  const isDetailLoading = (traceId: string) =>
    computed(() => detailLoading.value.has(traceId))

  return {
    listsByPanel,
    detailsById,
    fetchList,
    fetchDetail,
    getListForPanel,
    getSpansForTrace,
    isListLoading,
    isDetailLoading,
  }
})
