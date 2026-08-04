const CHANNEL_ICONS: Record<string, string> = {
  browser_navigation: 'mdi-earth',
  browser_xhr: 'mdi-swap-horizontal',
  api_client: 'mdi-api',
  bot: 'mdi-robot',
  unknown: 'mdi-help-circle-outline',
}

export function channelIcon(channel?: string | null): string {
  return CHANNEL_ICONS[channel ?? ''] ?? 'mdi-help-circle-outline'
}

export function channelLabel(channel?: string | null): string {
  // Older SDK versions never sent this field, so a permanently mixed fleet
  // is expected - "not reported" reads as an SDK-version gap, not as a
  // detected-and-unknown caller (which "unknown" itself already covers).
  return channel ?? 'Not reported (older SDK)'
}

// User-facing grouping over the raw `client_channel` values, for the
// dashboard-wide traffic filter. The server only ever knows raw channels
// (browser_navigation/browser_xhr/api_client/bot/unknown) - this mapping
// exists purely so the toolbar can offer "People / Bots / Servers" instead
// of making users reason about SSR internals to hide their own backend.
export type TrafficCategory = 'users' | 'bots' | 'servers' | 'unknown'

export const TRAFFIC_CATEGORIES: readonly TrafficCategory[] = ['users', 'bots', 'servers', 'unknown']

const CATEGORY_CHANNELS: Record<TrafficCategory, string[]> = {
  users: ['browser_navigation', 'browser_xhr'],
  bots: ['bot'],
  servers: ['api_client'],
  unknown: ['unknown'],
}

const CATEGORY_META: Record<TrafficCategory, { label: string, icon: string, tooltip: string }> = {
  users: {
    label: 'People',
    icon: 'mdi-account',
    tooltip: 'Browser page loads and in-app requests from real visitors.',
  },
  bots: {
    label: 'Crawlers & bots',
    icon: 'mdi-robot',
    tooltip: 'Search engine crawlers and other automated non-browser clients.',
  },
  servers: {
    label: 'Server-to-server',
    icon: 'mdi-api',
    tooltip: 'API clients calling directly, including your own app\'s SSR calling itself.',
  },
  unknown: {
    label: 'Unclassified',
    icon: 'mdi-help-circle-outline',
    tooltip: 'Channel could not be determined. Does not include logs from SDKs too old to '
      + 'report a channel at all - those have no value to filter on and are always included.',
  },
}

export function categoryLabel(category: TrafficCategory): string {
  return CATEGORY_META[category].label
}

export function categoryIcon(category: TrafficCategory): string {
  return CATEGORY_META[category].icon
}

export function categoryTooltip(category: TrafficCategory): string {
  return CATEGORY_META[category].tooltip
}

const CHANNEL_TO_CATEGORY: Record<string, TrafficCategory> = Object.fromEntries(
  Object.entries(CATEGORY_CHANNELS).flatMap(
    ([category, channels]) => channels.map(channel => [channel, category as TrafficCategory]),
  ),
)

export function categoryOfChannel(channel: string): TrafficCategory | null {
  return CHANNEL_TO_CATEGORY[channel] ?? null
}

// Same People/Bots/Server-to-server/Unclassified wording as the traffic
// category chips.
export function channelCategoryLabel(channel?: string | null): string {
  if (!channel)
    return channelLabel(channel)

  const category = categoryOfChannel(channel)

  return category
    ? categoryLabel(category)
    : channelLabel(channel)
}

// Raw `client_channel` values to send as filter params for the given set of
// selected categories. Returns null when every category is selected (or none
// is excluded), meaning "no filter" - callers should omit the param entirely
// rather than send every known channel, so older-SDK rows with no channel at
// all are never accidentally excluded.
export function channelsForCategories(categories: TrafficCategory[]): string[] | null {
  if (categories.length >= TRAFFIC_CATEGORIES.length)
    return null

  return categories.flatMap(c => CATEGORY_CHANNELS[c])
}
