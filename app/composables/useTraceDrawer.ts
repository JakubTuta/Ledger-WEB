const isOpen = ref(false)
const currentTraceId = ref<string | null>(null)

export function useTraceDrawer() {
  function openTrace(traceId: string) {
    currentTraceId.value = traceId
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    currentTraceId.value = null
  }

  return {
    isOpen,
    currentTraceId,
    openTrace,
    close,
  }
}
