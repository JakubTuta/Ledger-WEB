<template>
  <div>
    <div
      v-if="loading && events.length === 0"
      class="d-flex align-center justify-center pa-8"
    >
      <v-progress-circular
        indeterminate
        color="primary"
      />
    </div>

    <div
      v-else-if="events.length === 0"
      class="text-grey d-flex flex-column align-center justify-center gap-2 pa-8"
    >
      <v-icon
        icon="mdi-history"
        size="40"
      />

      <span class="text-body-2">No alert history yet</span>
    </div>

    <div v-else>
      <div class="hist-header d-flex align-center px-3 py-2">
        <span class="col-name text-caption font-weight-medium text-medium-emphasis">Rule</span>

        <span class="col-cond text-caption font-weight-medium text-medium-emphasis">Condition</span>

        <span class="col-val text-caption font-weight-medium text-medium-emphasis">Value</span>

        <span class="col-sent text-caption font-weight-medium text-medium-emphasis">Sent to</span>

        <span class="col-time text-caption font-weight-medium text-medium-emphasis">When</span>
      </div>

      <div
        v-for="ev in events"
        :key="ev.id"
        class="hist-row d-flex align-center px-3 py-2"
      >
        <div class="col-name d-flex align-center gap-2 text-truncate">
          <v-icon
            icon="mdi-fire"
            color="error"
            size="16"
          />

          <span class="text-body-2 text-truncate">{{ ev.rule_name }}</span>
        </div>

        <div class="col-cond text-caption text-mono text-medium-emphasis">
          {{ metricLabel(ev.metric) }} {{ ev.comparator }} {{ ev.threshold }}{{ ev.unit === 'count'
            ? ''
            : ev.unit }}
        </div>

        <div class="col-val text-caption font-weight-medium">
          {{ formatValue(ev.value, ev.unit) }}{{ ev.unit === 'count'
            ? ''
            : ev.unit }}
        </div>

        <div class="col-sent d-flex align-center gap-1">
          <v-icon
            v-for="(c, i) in parseConnectors(ev.connectors_sent)"
            :key="i"
            :icon="connectorMeta(c.kind).icon"
            :color="connectorMeta(c.kind).color"
            size="16"
          />

          <span
            v-if="parseConnectors(ev.connectors_sent).length === 0"
            class="text-caption text-medium-emphasis"
          >—</span>
        </div>

        <div class="col-time text-caption text-medium-emphasis">
          {{ formatTimestamp(ev.fired_at) }}
        </div>
      </div>

      <div
        v-if="hasMore"
        v-intersect="onIntersect"
        class="d-flex align-center my-4 justify-center"
      >
        <v-progress-circular
          v-if="loading"
          indeterminate
          color="primary"
          size="22"
        />

        <span
          v-else
          class="text-caption text-grey"
        >Scroll to load more...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AlertEvent, AlertUnit, ConnectorKind } from '~/types/alerts'
import { connectorMeta, metricLabel } from '~/types/alerts'

const props = defineProps<{
  events: AlertEvent[]
  hasMore?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  loadMore: []
}>()

const { formatTimestamp } = useRelativeTime()

function onIntersect(isIntersecting: boolean) {
  if (isIntersecting && props.hasMore && !props.loading)
    emit('loadMore')
}

function parseConnectors(json: string): { kind: ConnectorKind, name: string }[] {
  try {
    return JSON.parse(json)
  }
  catch {
    return []
  }
}

function formatValue(v: number, unit: AlertUnit): string {
  if (unit === 'count') {
    if (v >= 1000)
      return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`

    return String(Math.round(v))
  }

  if (unit === 'ms')
    return String(Math.round(v))

  return Number.isInteger(v)
    ? String(v)
    : v.toFixed(2).replace(/\.?0+$/, '')
}
</script>

<style scoped>
.hist-header {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.hist-row {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.hist-row:last-child {
  border-bottom: none;
}

.col-name { flex: 1 1 30%; min-width: 0; }
.col-cond { flex: 1 1 30%; min-width: 0; }
.col-val { flex: 0 0 90px; }
.col-sent { flex: 0 0 80px; }
.col-time { flex: 0 0 90px; text-align: right; }

.text-mono {
  font-family: 'Courier New', monospace;
}
</style>
