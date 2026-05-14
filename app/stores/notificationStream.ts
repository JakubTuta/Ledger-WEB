import type {
  InboxNotification,
  NotificationFilters,
  NotificationItem,
  NotificationsListResponse,
  SSEConnectedEvent,
  SSEErrorNotification,
} from '~/types/notifications'
import { defineStore } from 'pinia'

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

  const unreadCount = computed(() => inbox.value.filter(n => !n.read_at).length)

  let abortController: AbortController | null = null
  let reconnectTimeout: NodeJS.Timeout | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  // --- Inbox REST methods ---

  const fetchInbox = async (force = false) => {
    if (inboxLoading.value)
      return
    if (!force && inboxLastFetch.value && Date.now() - inboxLastFetch.value < 30_000)
      return

    inboxLoading.value = true
    try {
      const response = await client.get<NotificationsListResponse>('/api/v1/notifications', {
        params: { limit: 50, offset: 0 },
      })
      inbox.value = response.data.notifications.map(n => ({ ...n, expanded: false }))
      inboxTotal.value = response.data.total
      inboxHasMore.value = response.data.has_more
      inboxLastFetch.value = Date.now()
    }
    catch (error) {
      console.error('Error fetching notification inbox:', error)
    }
    finally {
      inboxLoading.value = false
    }
  }

  const fetchHistory = async (filters: NotificationFilters = {}) => {
    try {
      const response = await client.get<NotificationsListResponse>('/api/v1/notifications', {
        params: filters,
      })

      return response.data
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
      if (item)
        item.read_at = new Date().toISOString()
    }
    catch (error) {
      console.error('Error marking notification read:', error)
    }
  }

  const markAllRead = async () => {
    try {
      await client.post('/api/v1/notifications/read-all')
      inbox.value.forEach(n => (n.read_at = new Date().toISOString()))
    }
    catch (error) {
      console.error('Error marking all notifications read:', error)
    }
  }

  const deleteNotificationFromInbox = async (id: string) => {
    try {
      await client.delete(`/api/v1/notifications/${id}`)
      inbox.value = inbox.value.filter(n => n.id !== id)
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

        // Add to inbox
        const inboxItem: InboxNotification = {
          id: notification.id,
          kind: 'error_notification',
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
    fetchHistory,
    markRead,
    markAllRead,
    deleteNotificationFromInbox,
  }
})
