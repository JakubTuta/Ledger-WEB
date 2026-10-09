import type {
  InboxNotification,
  NotificationFilters,
  NotificationItem,
  NotificationKind,
  NotificationLevel,
  NotificationsListResponse,
  RawInboxListResponse,
  RawInboxNotification,
  SSEConnectedEvent,
  SSEErrorNotification,
} from '~/types/notifications'
import { defineStore } from 'pinia'

const SEVERITY_TO_LEVEL: Record<number, NotificationLevel> = {
  0: 'info',
  1: 'warning',
  2: 'critical',
}

function formatMetricNumber(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n))
    return String(value ?? '')

  return Number.isInteger(n)
    ? String(n)
    : n.toFixed(2).replace(/\.?0+$/, '')
}

interface NotificationLabel {
  errorType: string
  message: string
}

function describeRuleAlert(payload: Record<string, any>, resolved: boolean): NotificationLabel {
  const unit = payload.unit && payload.unit !== 'count'
    ? payload.unit
    : ''
  const name = payload.name ?? 'Alert rule'
  const current = `now ${formatMetricNumber(payload.value)}${unit}`

  if (resolved)
    return { errorType: 'Alert resolved', message: `${name}: recovered (${current})` }

  return {
    errorType: 'Alert firing',
    message: `${name}: ${payload.metric} ${payload.comparator} `
      + `${formatMetricNumber(payload.threshold)}${unit} (${current})`,
  }
}

function describeMonitorAlert(payload: Record<string, any>, resolved: boolean): NotificationLabel {
  const name = payload.monitor_name ?? 'Monitor'

  return resolved
    ? { errorType: 'Monitor recovered', message: `${name} is back up` }
    : { errorType: 'Monitor down', message: `${name} is down` }
}

// alert_firing / alert_resolved rows come from two producers with different payload shapes:
// alert rules and uptime monitors.
function describeAlertNotification(kind: NotificationKind, payload: Record<string, any>): NotificationLabel {
  const resolved = kind === 'alert_resolved'

  return payload.monitor_id !== undefined
    ? describeMonitorAlert(payload, resolved)
    : describeRuleAlert(payload, resolved)
}

// Publishers older than the `kind` field only mark alert rules via log_type.
function liveNotificationKind(live: SSEErrorNotification): NotificationKind {
  if (live.kind)
    return live.kind

  return live.log_type === 'alert'
    ? 'alert_firing'
    : 'error_notification'
}

function adaptRawNotification(raw: RawInboxNotification): InboxNotification {
  let payload: Record<string, any> = {}
  try {
    payload = raw.payload
      ? JSON.parse(raw.payload)
      : {}
  }
  catch {
    payload = {}
  }

  const level = SEVERITY_TO_LEVEL[raw.severity] ?? 'info'
  let message: string = payload.message ?? ''
  let errorType: string = payload.error_type ?? ''

  if (raw.kind === 'alert_firing' || raw.kind === 'alert_resolved') {
    ({ errorType, message } = describeAlertNotification(raw.kind, payload))
  }
  else if (raw.kind === 'quota_warning') {
    errorType = errorType || 'Quota warning'
  }

  return {
    id: String(raw.id),
    kind: raw.kind,
    level,
    message,
    error_type: errorType || undefined,
    project_id: raw.project_id,
    project_name: payload.project_name,
    timestamp: payload.fired_at || raw.created_at,
    read_at: raw.read_at,
    expanded: false,
  }
}

export const useNotificationStreamStore = defineStore('notificationStream', () => {
  const authStore = useAuthStore()
  const runtimeConfig = useRuntimeConfig()
  const { client } = useApiStore()

  // SSE live notifications (backwards compat)
  const notifications = ref<NotificationItem[]>([])
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)
  const connectedProjects = ref<number[]>([])

  // Persisted inbox
  const inbox = ref<InboxNotification[]>([])
  const inboxLoading = ref(false)
  const inboxLastFetch = ref<number | null>(null)
  const inboxHasMore = ref(false)
  const inboxTotal = ref(0)

  const serverUnreadCount = ref(0)
  const unreadCount = computed(() => Math.max(
    serverUnreadCount.value,
    inbox.value.filter(n => !n.read_at).length,
  ))

  // Transient top-right alert toasts
  const toasts = ref<InboxNotification[]>([])

  const dismissToast = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const pushToast = (notification: InboxNotification) => {
    if (toasts.value.some(t => t.id === notification.id))
      return
    toasts.value = [notification, ...toasts.value].slice(0, 4)
  }

  // Alert sound
  const soundEnabled = ref(true)
  if (import.meta.client)
    soundEnabled.value = localStorage.getItem('alertSoundEnabled') !== 'false'

  const seenAlertIds = new Set<string>()
  let alertSeedDone = false

  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    if (import.meta.client)
      localStorage.setItem('alertSoundEnabled', String(soundEnabled.value))
  }

  const playAlertSound = () => {
    if (!soundEnabled.value || !import.meta.client)
      return
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx)
        return
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.42)
      osc.onended = () => ctx.close()
    }
    catch {
      /* audio not available */
    }
  }

  const detectNewAlerts = (items: InboxNotification[]) => {
    let triggered = false
    for (const n of items) {
      const kind = (n as any).kind as string | undefined
      if (kind && kind.startsWith('alert_')) {
        if (!seenAlertIds.has(n.id)) {
          seenAlertIds.add(n.id)
          if (alertSeedDone && !n.read_at) {
            triggered = true
            if (kind === 'alert_firing')
              pushToast(n)
          }
        }
      }
    }
    alertSeedDone = true
    if (triggered)
      playAlertSound()
  }

  let abortController: AbortController | null = null
  let reconnectTimeout: NodeJS.Timeout | null = null
  let reconnectAttempts = 0
  // A dashboard left open (a wall screen, an on-call laptop) must come back
  // after a gateway deploy or network blip, so retries never stop; they back
  // off to one attempt a minute.
  const RECONNECT_BASE_DELAY = 3000
  const RECONNECT_MAX_DELAY = 60000
  // During an error storm every event lands here; without a ceiling the arrays
  // (and the per-event duplicate scan) grow until the tab stalls.
  const LIVE_NOTIFICATIONS_LIMIT = 100
  const INBOX_LIMIT = 500

  // --- Inbox REST methods ---

  const fetchUnreadCount = async () => {
    try {
      const response = await client.get<{ count: number }>(
        '/api/v1/notifications/unread-count',
      )
      serverUnreadCount.value = response.data.count
    }
    catch {
      /* non-critical */
    }
  }

  const fetchInbox = async (force = false) => {
    if (inboxLoading.value)
      return
    if (!force && inboxLastFetch.value && Date.now() - inboxLastFetch.value < 30_000)
      return

    inboxLoading.value = true
    try {
      const response = await client.get<RawInboxListResponse>('/api/v1/notifications', {
        params: { limit: 50 },
      })
      inbox.value = response.data.notifications.map(adaptRawNotification)
      inboxHasMore.value = response.data.has_more
      inboxTotal.value = inbox.value.length
      inboxLastFetch.value = Date.now()
      detectNewAlerts(inbox.value)
      fetchUnreadCount()
    }
    catch (error) {
      console.error('Error fetching notification inbox:', error)
    }
    finally {
      inboxLoading.value = false
    }
  }

  const fetchMoreInbox = async () => {
    if (inboxLoading.value || !inboxHasMore.value || inbox.value.length === 0)
      return

    const numericIds = inbox.value
      .map(n => Number(n.id))
      .filter(id => Number.isFinite(id))
    if (numericIds.length === 0)
      return
    const beforeId = Math.min(...numericIds)

    inboxLoading.value = true
    try {
      const response = await client.get<RawInboxListResponse>('/api/v1/notifications', {
        params: { limit: 50, before_id: beforeId },
      })
      const adapted = response.data.notifications.map(adaptRawNotification)
      const existing = new Set(inbox.value.map(n => n.id))
      inbox.value.push(...adapted.filter(n => !existing.has(n.id)))
      inboxHasMore.value = response.data.has_more
      inboxTotal.value = inbox.value.length
    }
    catch (error) {
      console.error('Error fetching more notifications:', error)
    }
    finally {
      inboxLoading.value = false
    }
  }

  const fetchHistory = async (
    filters: NotificationFilters = {},
  ): Promise<NotificationsListResponse | null> => {
    const params: Record<string, string | number | boolean> = {
      limit: filters.limit ?? 50,
    }
    if (filters.unread)
      params.unread_only = true
    if (filters.before_id)
      params.before_id = filters.before_id
    if (filters.project_id)
      params.project_id = filters.project_id
    if (filters.kind)
      params.kind = filters.kind
    if (filters.created_after)
      params.created_after = filters.created_after
    if (filters.created_before)
      params.created_before = filters.created_before

    try {
      const response = await client.get<RawInboxListResponse>(
        '/api/v1/notifications',
        { params },
      )
      const notifications = response.data.notifications.map(adaptRawNotification)

      return {
        notifications,
        total: notifications.length,
        has_more: response.data.has_more,
      }
    }
    catch (error) {
      console.error('Error fetching notification history:', error)

      return null
    }
  }

  const markRead = async (id: string) => {
    try {
      await client.post(`/api/v1/notifications/${id}/read`)
      const item = inbox.value.find(n => n.id === id)
      if (item && !item.read_at) {
        item.read_at = new Date().toISOString()
        serverUnreadCount.value = Math.max(0, serverUnreadCount.value - 1)
      }
      dismissToast(id)
    }
    catch (error) {
      console.error('Error marking notification read:', error)
    }
  }

  const markAllRead = async () => {
    try {
      await client.post('/api/v1/notifications/read-all')
      inbox.value.forEach(n => (n.read_at = new Date().toISOString()))
      serverUnreadCount.value = 0
    }
    catch (error) {
      console.error('Error marking all notifications read:', error)
    }
  }

  const deleteNotificationFromInbox = async (id: string) => {
    try {
      await client.delete(`/api/v1/notifications/${id}`)
      const removed = inbox.value.find(n => n.id === id)
      if (removed && !removed.read_at)
        serverUnreadCount.value = Math.max(0, serverUnreadCount.value - 1)
      inbox.value = inbox.value.filter(n => n.id !== id)
      dismissToast(id)
    }
    catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const prependToInbox = (notification: InboxNotification) => {
    if (inbox.value.some(n => n.id === notification.id))
      return
    inbox.value.unshift({ ...notification, expanded: false })
    if (inbox.value.length > INBOX_LIMIT)
      inbox.value.splice(INBOX_LIMIT)
    inboxTotal.value = inbox.value.length
    detectNewAlerts([notification])
  }

  // --- SSE handling ---

  const handleSSEEvent = (event: string, data: string) => {
    try {
      if (event === 'connected') {
        const parsedData: SSEConnectedEvent = JSON.parse(data)
        isConnected.value = true
        connectionError.value = null
        reconnectAttempts = 0
        connectedProjects.value = parsedData.projects
        // Refetch inbox on (re)connect to catch missed events
        fetchInbox(true)
      }
      else if (event === 'error_notification' || event === 'message') {
        const parsedData: SSEErrorNotification = JSON.parse(data)

        const notification: NotificationItem = {
          ...parsedData,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          expanded: false,
          read_at: null,
        }

        notifications.value.unshift(notification)
        if (notifications.value.length > LIVE_NOTIFICATIONS_LIMIT)
          notifications.value.splice(LIVE_NOTIFICATIONS_LIMIT)

        const inboxItem: InboxNotification = {
          id: notification.id,
          kind: liveNotificationKind(parsedData),
          level: parsedData.level,
          message: parsedData.message,
          error_type: parsedData.error_type,
          project_id: parsedData.project_id,
          project_name: parsedData.project_name,
          stack_trace: parsedData.stack_trace,
          context: parsedData.context,
          timestamp: parsedData.timestamp || new Date().toISOString(),
          read_at: null,
          expanded: false,
        }
        prependToInbox(inboxItem)

        if (parsedData.project_id) {
          try {
            const panelsStore = usePanelsStore()
            panelsStore.addNewErrorToPanel(String(parsedData.project_id), parsedData)
          }
          catch {
            // Panels store might not be initialized yet
          }
        }
      }
    }
    catch (error) {
      console.error('Error parsing SSE event:', error, 'Data was:', data)
    }
  }

  const handleConnectionError = () => {
    isConnected.value = false
    connectionError.value = 'Connection lost'

    if (abortController) {
      abortController.abort()
      abortController = null
    }

    if (!authStore.isAuthenticated)
      return

    const delay = Math.min(RECONNECT_BASE_DELAY * 2 ** reconnectAttempts, RECONNECT_MAX_DELAY)
    reconnectAttempts++
    if (reconnectAttempts > 3)
      connectionError.value = 'Notification stream unavailable, retrying'
    if (reconnectTimeout)
      clearTimeout(reconnectTimeout)
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      connect()
    }, delay)
  }

  async function connect() {
    if (!import.meta.client)
      return
    if (!authStore.isAuthenticated || !authStore.token)
      return
    if (abortController)
      return

    try {
      abortController = new AbortController()
      const baseUrl = runtimeConfig.public.serverUrl as string
      const url = `${baseUrl}/api/v1/notifications/stream`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          Accept: 'text/event-stream',
        },
        signal: abortController.signal,
      })

      if (response.status === 401) {
        // The stream outlived the 15-minute access token; refresh before retrying.
        await authStore.refreshAccessToken()
      }
      if (!response.ok)
        throw new Error(`SSE connection failed: ${response.status}`)
      if (!response.body)
        throw new Error('Response body is null')

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
                  handleSSEEvent(currentEvent, currentData.join('\n'))
                  currentEvent = 'message'
                  currentData = []
                }
              }
            }
          }
          // The server ended the stream (e.g. a gateway restart): reconnect.
          handleConnectionError()
        }
        catch (error: any) {
          if (error.name === 'AbortError')
            return
          console.error('SSE stream error:', error)
          handleConnectionError()
        }
      }

      processStream()
    }
    catch (error: any) {
      if (error.name === 'AbortError')
        return
      console.error('Failed to establish SSE connection:', error)
      handleConnectionError()
    }
  }

  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isConnected.value = false
    connectionError.value = null
    reconnectAttempts = 0
    connectedProjects.value = []
  }

  // Legacy helpers kept for backwards compat
  const removeNotification = (notificationId: string) => {
    const index = notifications.value.findIndex(n => n.id === notificationId)
    if (index > -1)
      notifications.value.splice(index, 1)
  }

  const clearAll = () => {
    notifications.value = []
  }

  const toggleExpanded = (notificationId: string) => {
    const notification = inbox.value.find(n => n.id === notificationId)
    if (notification)
      notification.expanded = !notification.expanded
  }

  return {
    // SSE
    notifications,
    isConnected,
    connectionError,
    connectedProjects,
    connect,
    disconnect,
    removeNotification,
    clearAll,
    toggleExpanded,
    // Inbox
    inbox,
    inboxLoading,
    inboxHasMore,
    inboxTotal,
    unreadCount,
    fetchInbox,
    fetchMoreInbox,
    fetchUnreadCount,
    fetchHistory,
    markRead,
    markAllRead,
    deleteNotificationFromInbox,
    soundEnabled,
    toggleSound,
    toasts,
    pushToast,
    dismissToast,
  }
})
