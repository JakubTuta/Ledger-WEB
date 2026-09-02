const TICK_MS = 30000

/**
 * A `currentTime` ref that ticks every 30s, plus timestamp formatters derived
 * from it. Centralizes the relative/full timestamp formatting that was
 * duplicated (with its own polling interval) across several list views.
 */
export function useRelativeTime() {
  const currentTime = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    timer = setInterval(() => {
      currentTime.value = Date.now()
    }, TICK_MS)
  })

  onUnmounted(() => {
    if (timer)
      clearInterval(timer)
  })

  function formatTimestamp(timestamp?: string | null): string {
    if (!timestamp)
      return '—'
    try {
      const date = new Date(timestamp)
      const diff = currentTime.value - date.getTime()

      if (diff < 24 * 60 * 60 * 1000) {
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        if (hours > 0)
          return `${hours}h ago`
        if (minutes > 0)
          return `${minutes}m ago`
        if (seconds > 0)
          return `${seconds}s ago`

        return 'Just now'
      }

      const dd = String(date.getDate()).padStart(2, '0')
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const hh = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')

      return `${dd}-${mm} ${hh}:${min}`
    }
    catch {
      return timestamp
    }
  }

  function formatFullTimestamp(timestamp?: string | null): string {
    if (!timestamp)
      return '—'
    try {
      const date = new Date(timestamp)
      const dd = String(date.getDate()).padStart(2, '0')
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const yyyy = date.getFullYear()
      const hh = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      const ss = String(date.getSeconds()).padStart(2, '0')

      return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`
    }
    catch {
      return timestamp
    }
  }

  return { currentTime, formatTimestamp, formatFullTimestamp }
}
