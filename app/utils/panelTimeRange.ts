import type { Panel, TimeRangePreset } from '~/types/panel'

export interface ResolvedTimeRange {
  from: string
  to: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

// Mirrors the gateway's period presets (log_query._calculate_time_range_for_period),
// so a metric panel covers the same window as the log-backed panels beside it.
function presetStart(preset: TimeRangePreset, now: Date): Date {
  const today = utcMidnight(now)

  switch (preset) {
    case 'today':
      return today
    case 'last7days':
      return new Date(today.getTime() - 7 * DAY_MS)
    case 'last30days':
      return new Date(today.getTime() - 30 * DAY_MS)
    case 'currentWeek': {
      const daysSinceMonday = (today.getUTCDay() + 6) % 7

      return new Date(today.getTime() - daysSinceMonday * DAY_MS)
    }
    case 'currentMonth':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    case 'currentYear':
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  }
}

// A date-only boundary is a whole UTC day; sending it bare would make the
// server read it as midnight and drop the last day of the range.
function startOfBoundary(value: string): Date {
  return new Date(DATE_ONLY.test(value)
    ? `${value}T00:00:00Z`
    : value)
}

function endOfBoundary(value: string): Date {
  const start = startOfBoundary(value)

  return DATE_ONLY.test(value)
    ? new Date(start.getTime() + DAY_MS)
    : start
}

/**
 * `range` shortened to its last `days` days, for endpoints that cap the
 * window. `clamped` says whether anything was cut, so the panel can say so.
 */
export function clampToRecentDays(
  range: ResolvedTimeRange,
  days: number,
): ResolvedTimeRange & { clamped: boolean } {
  const end = new Date(range.to)
  const earliest = new Date(end.getTime() - days * DAY_MS)

  if (new Date(range.from) >= earliest)
    return { ...range, clamped: false }

  return { from: earliest.toISOString(), to: range.to, clamped: true }
}

/**
 * The absolute window a panel's period setting covers, as ISO timestamps, for
 * endpoints that take from/to rather than a named period. A panel with no
 * stored range falls back to last7days, like the other panel fetches.
 */
export function resolvePanelTimeRange(
  panel: Pick<Panel, 'period' | 'periodFrom' | 'periodTo'>,
  now: Date = new Date(),
): ResolvedTimeRange {
  if (!panel.period && panel.periodFrom && panel.periodTo) {
    const end = endOfBoundary(panel.periodTo)

    return {
      from: startOfBoundary(panel.periodFrom).toISOString(),
      to: new Date(Math.min(end.getTime(), now.getTime())).toISOString(),
    }
  }

  return {
    from: presetStart(panel.period ?? 'last7days', now).toISOString(),
    to: now.toISOString(),
  }
}
