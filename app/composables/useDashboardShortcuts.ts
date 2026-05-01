export function useDashboardShortcuts(handlers: {
  onNewPanel: () => void
  onRefresh: () => void
  onToggleEdit: () => void
  onShowHelp: () => void
}) {
  function isInputFocused(): boolean {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable
  }

  function handleKey(e: KeyboardEvent) {
    if (isInputFocused()) return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    switch (e.key) {
      case 'n':
        e.preventDefault()
        handlers.onNewPanel()
        break
      case 'r':
        e.preventDefault()
        handlers.onRefresh()
        break
      case 'e':
        e.preventDefault()
        handlers.onToggleEdit()
        break
      case '?':
        e.preventDefault()
        handlers.onShowHelp()
        break
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKey))
  onUnmounted(() => window.removeEventListener('keydown', handleKey))
}
