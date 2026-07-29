import type {
  InboxNotification,
  NotificationFilters,
  NotificationItem,
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

  if (raw.kind === 'alert_firing') {
    const unit = payload.unit && payload.unit !== 'count'
      ? payload.unit
      : ''
    const name = payload.name ?? 'Alert rule'
    errorType = 'Alert firing'
    message = `${name}: ${payload.metric} ${payload.comparator} `
      + `${formatMetricNumber(payload.threshold)}${unit} `
      + `(now ${formatMetricNumber(payload.value)}${unit})`
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
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

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
    const params: Record<string, any> = {
      limit: filters.limit ?? 50,
    }
    if (filters.unread)
      params.unread_only = true
    if ((filters as any).before_id)
      params.before_id = (filters as any).before_id

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
    inboxTotal.value++
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

        const isAlert = (parsedData as any).log_type === 'alert'

        const inboxItem: InboxNotification = {
          id: notification.id,
          kind: isAlert
            ? 'alert_firing'
            : 'error_notification',
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

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && authStore.isAuthenticated) {
      reconnectAttempts++
      reconnectTimeout = setTimeout(() => {
        connect()
      }, RECONNECT_DELAY)
    }
    else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      connectionError.value = 'Unable to connect to notification stream'
    }
  }

  const connect = async () => {
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
