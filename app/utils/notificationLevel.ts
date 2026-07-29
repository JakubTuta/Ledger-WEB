import type { NotificationLevel } from '~/types/notifications'

export function getLevelColor(level: NotificationLevel): string {
  const map: Record<string, string> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'info',
  }

  return map[level] ?? 'error'
}

export function getLevelIcon(level: NotificationLevel): string {
  const map: Record<string, string> = {
    critical: 'mdi-alert-circle',
    error: 'mdi-alert',
    warning: 'mdi-alert-outline',
    info: 'mdi-information-outline',
  }

  return map[level] ?? 'mdi-alert'
}
