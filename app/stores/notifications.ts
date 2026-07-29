import type { NotificationPreferencesResponse, NotificationPreferencesUpdate } from '~/types/notifications'
import { defineStore } from 'pinia'

export const useNotificationsStore = defineStore('notifications', () => {
  const { client } = useApiStore()

  const preferences = ref<NotificationPreferencesResponse | null>(null)
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)

  const hasData = computed(() => preferences.value !== null)

  const fetchPreferences = async (force = false) => {
    if (isLoading.value)
      return

    if (!force && preferences.value)
      return

    isLoading.value = true

    try {
      const response = await client.get<NotificationPreferencesResponse>('/api/v1/notifications/preferences')

      preferences.value = response.data
      lastFetchTime.value = new Date()
    }
    catch {
      preferences.value = {
        enabled: false,
        projects: {},
      }
    }
    finally {
      isLoading.value = false
    }
  }

  const updatePreferences = async (updates: NotificationPreferencesUpdate) => {
    isLoading.value = true

    try {
      const response = await client.put<NotificationPreferencesResponse>(
        '/api/v1/notifications/preferences',
        updates,
      )

      preferences.value = response.data
      lastFetchTime.value = new Date()

      return { success: true, data: response.data }
    }
    catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update notification preferences'

      return { success: false, error: errorMessage }
    }
    finally {
      isLoading.value = false
    }
  }

  const refreshPreferences = async () => {
    await fetchPreferences(true)
  }

  return {
    preferences,
    isLoading,
    lastFetchTime,
    hasData,
    fetchPreferences,
    updatePreferences,
    refreshPreferences,
  }
})
