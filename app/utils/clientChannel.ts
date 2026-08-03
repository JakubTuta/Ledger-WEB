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
