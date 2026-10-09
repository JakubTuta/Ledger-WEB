const LOG_LEVEL_COLORS: Record<string, string> = {
  debug: 'grey',
  info: 'info',
  warning: 'warning',
  error: 'error',
  critical: 'error',
}

/** Vuetify color for a stored log level (debug/info/warning/error/critical). */
export function logLevelColor(level: string): string {
  return LOG_LEVEL_COLORS[level] ?? 'grey'
}
