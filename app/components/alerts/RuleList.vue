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
            :icon="connectorMeta(kind).icon"
            :color="connectorMeta(kind).color"
            size="16"
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
import { connectorMeta, metricLabel, SEVERITY_LABELS } from '~/types/alerts'

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

const { formatTimestamp } = useRelativeTime()

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

function severityLabel(s: number): string {
  return SEVERITY_LABELS[s] ?? 'warning'
}

function severityColor(s: number): string {
  return { 0: 'info', 1: 'warning', 2: 'error' }[s] ?? 'warning'
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
