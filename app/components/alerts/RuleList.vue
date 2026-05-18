<template>
  <div>
    <div
      v-if="loading && rules.length === 0"
      class="d-flex align-center justify-center pa-8"
    >
      <v-progress-circular
        indeterminate
        color="primary"
      />
    </div>

    <div
      v-else-if="rules.length === 0"
      class="text-grey d-flex flex-column align-center justify-center gap-2 pa-8"
    >
      <v-icon
        icon="mdi-bell-off-outline"
        size="40"
      />

      <span class="text-body-2">No alert rules yet</span>
    </div>

    <div v-else>
      <div class="rule-header d-flex align-center px-3 py-2">
        <span class="col-toggle" />

        <span class="col-name text-caption font-weight-medium text-medium-emphasis">Rule</span>

        <span class="col-metric text-caption font-weight-medium text-medium-emphasis">Condition</span>

        <span class="col-conn text-caption font-weight-medium text-medium-emphasis">Channels</span>

        <span class="col-fired text-caption font-weight-medium text-medium-emphasis">Last fired</span>

        <span class="col-actions" />
      </div>

      <div
        v-for="rule in rules"
        :key="rule.id"
        class="rule-row d-flex align-center px-3 py-2"
      >
        <div class="col-toggle">
          <v-switch
            :model-value="rule.enabled"
            color="primary"
            density="compact"
            hide-details
            @update:model-value="emit('toggle', rule, $event as boolean)"
          />
        </div>

        <div class="col-name">
          <div class="d-flex align-center gap-2">
            <v-icon
              :icon="rule.last_state === 'firing'
                ? 'mdi-fire'
                : 'mdi-check-circle'"
              :color="rule.last_state === 'firing'
                ? 'error'
                : 'success'"
              size="16"
            />

            <span class="text-body-2 font-weight-medium text-truncate">{{ rule.name }}</span>

            <v-chip
              :color="severityColor(rule.severity)"
              size="x-small"
              variant="tonal"
              label
            >
              {{ severityLabel(rule.severity) }}
            </v-chip>
          </div>
        </div>

        <div class="col-metric text-caption text-mono">
          {{ metricLabel(rule.metric) }} {{ rule.comparator }} {{ rule.threshold }}{{ rule.unit === 'count'
            ? ''
            : rule.unit }}
        </div>

        <div class="col-conn d-flex align-center gap-1">
          <v-icon
            v-for="kind in connectorKinds(rule)"
            :key="kind"
            :icon="kindIcon(kind)"
            size="16"
            class="text-medium-emphasis"
          />

          <span
            v-if="connectorKinds(rule).length === 0"
            class="text-caption text-medium-emphasis"
          >—</span>
        </div>

        <div class="col-fired text-caption text-medium-emphasis">
          {{ rule.last_fired_at
            ? formatTimestamp(rule.last_fired_at)
            : 'Never' }}
        </div>

        <div class="col-actions d-flex align-center gap-1">
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="x-small"
            @click="emit('edit', rule)"
          />

          <v-btn
            icon="mdi-delete"
            variant="text"
            size="x-small"
            color="error"
            @click="emit('delete', rule)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AlertRule, Connector, ConnectorKind } from '~/types/alerts'
import { metricLabel, SEVERITY_LABELS } from '~/types/alerts'

const props = defineProps<{
  rules: AlertRule[]
  connectors: Connector[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [AlertRule]
  delete: [AlertRule]
  toggle: [AlertRule, boolean]
}>()

const currentTime = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})

const connectorById = computed(() => {
  const map = new Map<number, Connector>()
  props.connectors.forEach(c => map.set(c.id, c))

  return map
})

function connectorKinds(rule: AlertRule): ConnectorKind[] {
  const kinds = new Set<ConnectorKind>()
  rule.connector_ids.forEach((id) => {
    const c = connectorById.value.get(id)
    if (c)
      kinds.add(c.kind)
  })

  return [...kinds]
}

function kindIcon(kind: ConnectorKind): string {
  return { webhook: 'mdi-webhook', email: 'mdi-email', in_app: 'mdi-bell' }[kind]
}

function severityLabel(s: number): string {
  return SEVERITY_LABELS[s] ?? 'warning'
}

function severityColor(s: number): string {
  return { 0: 'info', 1: 'warning', 2: 'error' }[s] ?? 'warning'
}

function formatTimestamp(timestamp: string): string {
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
</script>

<style scoped>
.rule-header {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rule-row {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rule-row:last-child {
  border-bottom: none;
}

.rule-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.col-toggle { width: 56px; flex-shrink: 0; }
.col-name { flex: 1 1 30%; min-width: 0; }
.col-metric { flex: 1 1 28%; min-width: 0; }
.col-conn { flex: 0 0 90px; }
.col-fired { flex: 0 0 90px; text-align: right; }
.col-actions { flex: 0 0 70px; justify-content: flex-end; }

.text-mono {
  font-family: 'Courier New', monospace;
}
</style>
