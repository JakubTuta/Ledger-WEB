import type { NotificationItem, SSEConnectedEvent, SSEErrorNotification } from '~/types/notifications'
import { defineStore } from 'pinia'

export const useNotificationStreamStore = defineStore('notificationStream', () => {
  const authStore = useAuthStore()
  const runtimeConfig = useRuntimeConfig()

  const notifications = ref<NotificationItem[]>([])
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)
  const connectedProjects = ref<number[]>([])

  let abortController: AbortController | null = null
  let reconnectTimeout: NodeJS.Timeout | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  const handleSSEEvent = (event: string, data: string) => {
    try {
      if (event === 'connected') {
        const parsedData: SSEConnectedEvent = JSON.parse(data)

        isConnected.value = true
        connectionError.value = null
        reconnectAttempts = 0
        connectedProjects.value = parsedData.projects
      }
      else if (event === 'error_notification' || event === 'message') {
        const parsedData: SSEErrorNotification = JSON.parse(data)

        const notification: NotificationItem = {
          ...parsedData,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          expanded: false,
        }

        notifications.value.unshift(notification)

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

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

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
                const data = line.substring(5).trim()
                currentData.push(data)
              }
              else if (trimmedLine === '' || line === '') {
                if (currentData.length > 0) {
                  const completeData = currentData.join('\n')
                  handleSSEEvent(currentEvent, completeData)
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

  const removeNotification = (notificationId: string) => {
    const index = notifications.value.findIndex(n => n.id === notificationId)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearAll = () => {
    notifications.value = []
  }

  const toggleExpanded = (notificationId: string) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.expanded = !notification.expanded
    }
  }

  return {
    notifications,
    isConnected,
    connectionError,
    connectedProjects,
    connect,
    disconnect,
    removeNotification,
    clearAll,
    toggleExpanded,
  }
})
