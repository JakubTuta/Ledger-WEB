import type { Span, TraceDetailResponse, TraceListFilters, TraceListResponse, TraceSummary } from '~/types/traces'
import { defineStore } from 'pinia'

export const useTracesStore = defineStore('traces', () => {
  const { client } = useApiStore()

  const listsByPanel = ref<Map<string | number, TraceSummary[]>>(new Map())
  const detailsById = ref<Map<string, Span[]>>(new Map())
  const listLoading = ref<Set<string | number>>(new Set())
  const detailLoading = ref<Set<string>>(new Set())
  const listHasMore = ref<Map<string | number, boolean>>(new Map())
  const listOffset = ref<Map<string | number, number>>(new Map())
  const listError = ref<Map<string | number, string>>(new Map())
  const detailError = ref<Map<string, string>>(new Map())

  function messageFor(error: any, fallback: string): string {
    return error?.response?.data?.detail || error?.message || fallback
  }

  const fetchList = async (panelId: string | number, filters: TraceListFilters, force = false, offset = 0): Promise<boolean> => {
    if (listLoading.value.has(panelId) && !force && offset === 0)
      return false
    listLoading.value.add(panelId)
    listError.value.delete(panelId)
    try {
      const params: Record<string, any> = { limit: 25, offset }
      if (filters.project_id)
        params.project_id = filters.project_id
      if (filters.service)
        params.service = filters.service
      if (filters.operation)
        params.operation = filters.operation
      if (filters.min_duration_ms)
        params.min_duration_ms = filters.min_duration_ms
      if (filters.has_error !== undefined)
        params.has_error = filters.has_error
      if (filters.from)
        params.from = filters.from
      if (filters.to)
        params.to = filters.to

      const response = await client.get<TraceListResponse>('/api/v1/traces', { params })
      const newTraces = response.data.traces ?? []

      if (offset === 0) {
        listsByPanel.value.set(panelId, newTraces)
      }
      else {
        const current = listsByPanel.value.get(panelId) ?? []
        listsByPanel.value.set(panelId, [...current, ...newTraces])
      }

      listOffset.value.set(panelId, offset)
      listHasMore.value.set(panelId, response.data.has_more ?? false)

      return true
    }
    catch (error: any) {
      console.error('Error fetching trace list:', error)
      if (offset === 0)
        listsByPanel.value.set(panelId, [])
      listHasMore.value.set(panelId, false)
      listError.value.set(panelId, messageFor(error, 'Failed to load traces'))

      return false
    }
    finally {
      listLoading.value.delete(panelId)
    }
  }

  const fetchDetail = async (traceId: string, projectId: string | number, force = false) => {
    if (detailLoading.value.has(traceId) && !force)
      return
    if (!force && detailsById.value.has(traceId))
      return
    detailLoading.value.add(traceId)
    detailError.value.delete(traceId)
    try {
      const response = await client.get<TraceDetailResponse>(`/api/v1/traces/${traceId}`, {
        params: { project_id: projectId },
      })
      detailsById.value.set(traceId, response.data.spans ?? [])
    }
    catch (error: any) {
      console.error('Error fetching trace detail:', error)
      detailError.value.set(traceId, messageFor(error, 'Failed to load trace'))
    }
    finally {
      detailLoading.value.delete(traceId)
    }
  }

  const getListForPanel = (panelId: string | number) => computed(() => listsByPanel.value.get(panelId) ?? [])

  const getSpansForTrace = (traceId: string) => computed(() => detailsById.value.get(traceId) ?? [])

  const isListLoading = (panelId: string | number) => computed(() => listLoading.value.has(panelId))

  const isDetailLoading = (traceId: string) => computed(() => detailLoading.value.has(traceId))

  const getListHasMore = (panelId: string | number) => computed(() => listHasMore.value.get(panelId) ?? false)

  const getListOffset = (panelId: string | number) => computed(() => listOffset.value.get(panelId) ?? 0)

  const getListError = (panelId: string | number) => computed(() => listError.value.get(panelId) ?? null)

  const getDetailError = (traceId: string) => computed(() => detailError.value.get(traceId) ?? null)

  const MAX_EXPORT_TRACES = 5000

  // Throws on a failed page rather than returning what it managed to collect:
  // fetchList() clears has_more on error, so swallowing the failure would end
  // the loop and hand the caller a partial export labelled complete.
  const fetchAllListForPanel = async (panelId: string | number, filters: TraceListFilters): Promise<{ truncated: boolean }> => {
    if ((listsByPanel.value.get(panelId) ?? []).length === 0) {
      const ok = await fetchList(panelId, filters, false, 0)
      if (!ok)
        throw new Error(listError.value.get(panelId) ?? 'Failed to load traces')
    }

    while (listHasMore.value.get(panelId) ?? false) {
      const before = (listsByPanel.value.get(panelId) ?? []).length
      if (before >= MAX_EXPORT_TRACES)
        return { truncated: true }

      // eslint-disable-next-line no-await-in-loop
      const ok = await fetchList(panelId, filters, false, before)
      if (!ok)
        throw new Error(listError.value.get(panelId) ?? 'Failed to load traces')

      const after = (listsByPanel.value.get(panelId) ?? []).length
      if (after === before)
        break
    }

    return { truncated: false }
  }

  return {
    listsByPanel,
    detailsById,
    fetchList,
    fetchAllListForPanel,
    fetchDetail,
    getListForPanel,
    getSpansForTrace,
    isListLoading,
    isDetailLoading,
    getListHasMore,
    getListOffset,
    getListError,
    getDetailError,
  }
})
