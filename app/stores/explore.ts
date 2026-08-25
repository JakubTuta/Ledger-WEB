import type {
  ExploreFacetField,
  ExploreFacets,
  ExploreFilters,
  ExploreLogEntry,
  ExploreLogsResponse,
} from '~/types/explore'
import type { TimeRangePreset } from '~/types/panel'
import { defineStore } from 'pinia'

const LIMIT = 50
// Poll interval for the live-tail fallback path (used only when the SSE
// stream can't be established - see connectTailStream() below).
const TAIL_POLL_MS = 4000
// Ceiling on the client-side log buffer while tailing. Without it a long-lived
// tail on a busy project grows the array (and the O(n) duplicate check on every
// pushed event) without bound until the tab runs out of memory.
const TAIL_MAX_LOGS = 1000

const TIME_RANGE_STORAGE_KEY = 'ledger_explore_time_range'

const TIME_RANGE_PRESETS: TimeRangePreset[] = [
  'today',
  'last7days',
  'last30days',
  'currentWeek',
  'currentMonth',
  'currentYear',
]

interface StoredTimeRange {
  period: TimeRangePreset | null
  periodFrom: string | null
  periodTo: string | null
}

function defaultFilters(): ExploreFilters {
  return {
    projectId: null,
    period: 'last7days',
    periodFrom: null,
    periodTo: null,
    level: null,
    logType: null,
    statusClass: [],
    environment: null,
    search: '',
    clientChannel: [],
  }
}

// The chosen time range is remembered per project rather than globally: a
// low-traffic project is usually read over a week, a busy one over the last
// hours, and switching projects shouldn't drag the previous window along.
function loadStoredTimeRanges(): Record<string, StoredTimeRange> {
  try {
    if (typeof localStorage === 'undefined')
      return {}
    const raw = localStorage.getItem(TIME_RANGE_STORAGE_KEY)
    if (!raw)
      return {}
    const parsed = JSON.parse(raw)

    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, StoredTimeRange>
      : {}
  }
  catch {
    return {}
  }
}

function saveStoredTimeRange(projectId: string, range: StoredTimeRange) {
  try {
    if (typeof localStorage === 'undefined')
      return
    const all = loadStoredTimeRanges()
    all[projectId] = range
    localStorage.setItem(TIME_RANGE_STORAGE_KEY, JSON.stringify(all))
  }
  catch { /* noop */ }
}

function readStoredTimeRange(projectId: string): StoredTimeRange | null {
  const stored = loadStoredTimeRanges()[projectId]
  if (!stored)
    return null

  const period = stored.period && TIME_RANGE_PRESETS.includes(stored.period)
    ? stored.period
    : null
  if (period)
    return { period, periodFrom: null, periodTo: null }

  return stored.periodFrom && stored.periodTo
    ? { period: null, periodFrom: stored.periodFrom, periodTo: stored.periodTo }
    : null
}

export const useExploreStore = defineStore('explore', () => {
  const { client } = useApiStore()

  const filters = ref<ExploreFilters>(defaultFilters())

  const logs = ref<ExploreLogEntry[]>([])
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const hasMore = ref(false)
  const nextCursor = ref<string | null>(null)
  const loadError = ref<string | null>(null)

  const facets = ref<ExploreFacets | null>(null)
  const facetsLoading = ref(false)
  const facetsError = ref<string | null>(null)

  const selectedLog = ref<ExploreLogEntry | null>(null)

  const tailActive = ref(false)
  let tailTimer: ReturnType<typeof setInterval> | null = null
  let tailSince: string | null = null
  let tailInFlight = false

  function buildTimeParams(params: URLSearchParams) {
    if (!filters.value.period && filters.value.periodFrom && filters.value.periodTo) {
      params.set('periodFrom', filters.value.periodFrom)
      params.set('periodTo', filters.value.periodTo)
    }
    else {
      params.set('period', filters.value.period ?? 'last7days')
    }
  }

  function buildBaseParams(options: { includeSearch: boolean } = { includeSearch: true }): URLSearchParams {
    const params = new URLSearchParams()
    if (filters.value.projectId)
      params.set('project_id', filters.value.projectId)
    if (filters.value.level)
      params.set('level', filters.value.level)
    if (filters.value.logType)
      params.set('log_type', filters.value.logType)
    if (filters.value.environment)
      params.set('environment', filters.value.environment)
    for (const sc of filters.value.statusClass)
      params.append('status_class', sc)
    if (options.includeSearch && filters.value.search)
      params.set('search', filters.value.search)
    for (const channel of filters.value.clientChannel)
      params.append('client_channel', channel)

    return params
  }

  const fetchLogs = async (opts: { append?: boolean } = {}) => {
    if (!filters.value.projectId)
      return
    if (opts.append
      ? isLoadingMore.value
      : isLoading.value) {
      return
    }

    if (opts.append)
      isLoadingMore.value = true
    else
      isLoading.value = true
    loadError.value = null

    try {
      const params = buildBaseParams()
      buildTimeParams(params)
      params.set('limit', String(LIMIT))
      // Keyset cursor for "load more" (stable across duplicate timestamps,
      // no deep-offset scan cost); plain offset=0 for a fresh/reset fetch.
      if (opts.append && nextCursor.value)
        params.set('cursor', nextCursor.value)
      else
        params.set('offset', '0')

      const response = await client.get<ExploreLogsResponse>(
        `/api/v1/logs?${params.toString()}`,
      )

      if (opts.append)
        logs.value = [...logs.value, ...response.data.logs]
      else
        logs.value = response.data.logs

      hasMore.value = response.data.has_more
      nextCursor.value = response.data.next_cursor
    }
    catch (error: any) {
      console.error('Error fetching explore logs:', error)
      loadError.value = error?.response?.data?.detail || error?.message || 'Failed to load logs'
      if (!opts.append)
        logs.value = []
      hasMore.value = false
    }
    finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  const loadMore = async () => {
    if (!hasMore.value || isLoadingMore.value)
      return
    await fetchLogs({ append: true })
  }

  const fetchFacets = async () => {
    if (!filters.value.projectId)
      return
    facetsLoading.value = true
    facetsError.value = null
    try {
      // Deliberately excludes `search`: a free-text term can't be answered
      // from the log_facets_1h rollup the facets endpoint reads, so sending it
      // forces a full scan of every log row in the window. The sidebar counts
      // describe the structural filters plus the time range; the search box
      // narrows the log list only.
      const params = buildBaseParams({ includeSearch: false })
      buildTimeParams(params)
      const response = await client.get<ExploreFacets & { project_id: number }>(
        `/api/v1/logs/facets?${params.toString()}`,
      )
      facets.value = {
        level: response.data.level,
        log_type: response.data.log_type,
        status_class: response.data.status_class,
        environment: response.data.environment,
        client_channel: response.data.client_channel,
      }
    }
    catch (error: any) {
      console.error('Error fetching log facets:', error)
      facets.value = null
      // Without this the sidebar falls back to its "select a project" copy,
      // which reads as "nothing to filter on" rather than "the request failed".
      facetsError.value = error?.response?.data?.detail || error?.message || 'Failed to load filters'
    }
    finally {
      facetsLoading.value = false
    }
  }

  const refresh = async () => {
    await Promise.all([fetchLogs(), fetchFacets()])
  }

  // Restores the time range remembered for the currently selected project,
  // falling back to the default window when that project has none.
  const restoreTimeRange = () => {
    const projectId = filters.value.projectId
    const stored = projectId
      ? readStoredTimeRange(projectId)
      : null
    const fallback = defaultFilters()

    filters.value.period = stored
      ? stored.period
      : fallback.period
    filters.value.periodFrom = stored?.periodFrom ?? null
    filters.value.periodTo = stored?.periodTo ?? null
  }

  const setProject = async (projectId: string | null) => {
    if (filters.value.projectId === projectId)
      return
    filters.value.projectId = projectId
    restoreTimeRange()
    nextCursor.value = null
    await refresh()
  }

  const setTimeRange = async (range: { period?: TimeRangePreset | null, periodFrom?: string | null, periodTo?: string | null }) => {
    if (range.period !== undefined) {
      filters.value.period = range.period
      filters.value.periodFrom = null
      filters.value.periodTo = null
    }
    if (range.periodFrom !== undefined && range.periodTo !== undefined) {
      filters.value.period = null
      filters.value.periodFrom = range.periodFrom
      filters.value.periodTo = range.periodTo
    }

    if (filters.value.projectId) {
      saveStoredTimeRange(filters.value.projectId, {
        period: filters.value.period,
        periodFrom: filters.value.periodFrom,
        periodTo: filters.value.periodTo,
      })
    }

    nextCursor.value = null
    await refresh()
  }

  // Facet counts don't reflect `search` (see fetchFacets), so a search term
  // only re-runs the log query.
  const setSearch = async (term: string) => {
    filters.value.search = term
    nextCursor.value = null
    await fetchLogs()
  }

  // Clicking a facet value toggles it: level/log_type/environment are
  // single-select (clicking the active value clears it); status_class is
  // multi-select (matches the repeated status_class query param on GET /logs).
  const toggleFacet = async (field: ExploreFacetField, value: string) => {
    if (field === 'status_class') {
      const idx = filters.value.statusClass.indexOf(value)
      if (idx === -1)
        filters.value.statusClass = [...filters.value.statusClass, value]
      else
        filters.value.statusClass = filters.value.statusClass.filter(v => v !== value)
    }
    else if (field === 'level') {
      filters.value.level = filters.value.level === value
        ? null
        : value
    }
    else if (field === 'log_type') {
      filters.value.logType = filters.value.logType === value
        ? null
        : value
    }
    else if (field === 'environment') {
      filters.value.environment = filters.value.environment === value
        ? null
        : value
    }
    else if (field === 'client_channel') {
      const idx = filters.value.clientChannel.indexOf(value)
      if (idx === -1)
        filters.value.clientChannel = [...filters.value.clientChannel, value]
      else
        filters.value.clientChannel = filters.value.clientChannel.filter(v => v !== value)
    }

    nextCursor.value = null
    await refresh()
  }

  const isFacetActive = (field: ExploreFacetField, value: string): boolean => {
    if (field === 'status_class')
      return filters.value.statusClass.includes(value)
    if (field === 'level')
      return filters.value.level === value
    if (field === 'log_type')
      return filters.value.logType === value
    if (field === 'client_channel')
      return filters.value.clientChannel.includes(value)

    return filters.value.environment === value
  }

  const clearFilters = async () => {
    const projectId = filters.value.projectId
    const period = filters.value.period
    const periodFrom = filters.value.periodFrom
    const periodTo = filters.value.periodTo
    filters.value = { ...defaultFilters(), projectId, period, periodFrom, periodTo }
    nextCursor.value = null
    await refresh()
  }

  const openLogDetail = (log: ExploreLogEntry) => {
    selectedLog.value = log
  }

  const closeLogDetail = () => {
    selectedLog.value = null
  }

  // --- Live tail (SSE, with polling as automatic fallback) ---
  //
  // Server push via GET /api/v1/logs/tail, a Redis pub/sub SSE stream fed by
  // the ingestion worker after every accepted batch (see
  // notifications/publisher.py::TailPublisher). Uses the same
  // fetch()+ReadableStream idiom as notificationStream.ts::connect() rather
  // than native EventSource, since a custom Authorization header is needed.
  // If the stream can't be established, pollTail() (GET /logs on an
  // interval) takes over instead.
  let tailAbortController: AbortController | null = null

  const handleTailEvent = (event: string, data: string) => {
    if (event !== 'log')
      return
    try {
      const parsed = JSON.parse(data) as ExploreLogEntry
      if (logs.value.some(l => l.id === parsed.id))
        return
      logs.value = [parsed, ...logs.value].slice(0, TAIL_MAX_LOGS)
    }
    catch (error) {
      console.error('Error parsing log tail event:', error, 'Data was:', data)
    }
  }

  const connectTailStream = async (): Promise<boolean> => {
    const authStore = useAuthStore()
    if (!filters.value.projectId || !authStore.token)
      return false

    try {
      tailAbortController = new AbortController()
      const runtimeConfig = useRuntimeConfig()
      const baseUrl = runtimeConfig.public.serverUrl as string
      const url = `${baseUrl}/api/v1/logs/tail?project_id=${filters.value.projectId}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          Accept: 'text/event-stream',
        },
        signal: tailAbortController.signal,
      })

      if (!response.ok || !response.body)
        return false

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const processStream = async () => {
        try {
          let currentEvent = 'message'
          let currentData: string[] = []

          while (true) {
            // eslint-disable-next-line no-await-in-loop
            const { done, value } = await reader.read()
            if (done)
              break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split(/\r?\n/)
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmedLine = line.trim()
              if (line.startsWith('event:')) {
                currentEvent = line.substring(6).trim()
              }
              else if (line.startsWith('data:')) {
                currentData.push(line.substring(5).trim())
              }
              else if (trimmedLine === '' || line === '') {
                if (currentData.length > 0) {
                  handleTailEvent(currentEvent, currentData.join('\n'))
                  currentEvent = 'message'
                  currentData = []
                }
              }
            }
          }
        }
        catch (error: any) {
          if (error.name !== 'AbortError')
            console.error('Log tail stream error:', error)
        }
      }

      processStream()

      return true
    }
    catch (error: any) {
      if (error.name === 'AbortError')
        return false
      console.error('Failed to establish log tail SSE connection:', error)

      return false
    }
  }

  const disconnectTailStream = () => {
    if (tailAbortController) {
      tailAbortController.abort()
      tailAbortController = null
    }
  }

  const pollTail = async () => {
    if (tailInFlight || !filters.value.projectId)
      return
    tailInFlight = true
    try {
      const params = buildBaseParams()
      const now = new Date()
      params.set('periodFrom', tailSince ?? new Date(now.getTime() - TAIL_POLL_MS).toISOString())
      params.set('periodTo', now.toISOString())
      params.set('limit', '100')
      params.set('offset', '0')

      const response = await client.get<ExploreLogsResponse>(
        `/api/v1/logs?${params.toString()}`,
      )

      const incoming = response.data.logs
      if (incoming.length > 0) {
        // GET /logs returns newest-first; incoming[0] is the most recent.
        tailSince = incoming[0]!.timestamp
        const existingIds = new Set(logs.value.map(l => l.id))
        const fresh = incoming.filter(l => !existingIds.has(l.id))
        if (fresh.length > 0)
          logs.value = [...fresh, ...logs.value].slice(0, TAIL_MAX_LOGS)
      }
      else {
        tailSince = now.toISOString()
      }
    }
    catch (error) {
      console.error('Error polling log tail:', error)
    }
    finally {
      tailInFlight = false
    }
  }

  const startTail = async () => {
    if (tailActive.value)
      return
    tailActive.value = true

    const connected = await connectTailStream()
    if (!connected) {
      tailSince = new Date().toISOString()
      tailTimer = setInterval(pollTail, TAIL_POLL_MS)
    }
  }

  const stopTail = () => {
    tailActive.value = false
    tailSince = null
    disconnectTailStream()
    if (tailTimer) {
      clearInterval(tailTimer)
      tailTimer = null
    }
  }

  const toggleTail = () => {
    if (tailActive.value)
      stopTail()
    else
      startTail()
  }

  return {
    filters,
    logs,
    isLoading,
    isLoadingMore,
    hasMore,
    loadError,
    facets,
    facetsLoading,
    facetsError,
    selectedLog,
    tailActive,
    fetchLogs,
    loadMore,
    fetchFacets,
    refresh,
    restoreTimeRange,
    setProject,
    setTimeRange,
    setSearch,
    toggleFacet,
    isFacetActive,
    clearFilters,
    openLogDetail,
    closeLogDetail,
    startTail,
    stopTail,
    toggleTail,
  }
})
