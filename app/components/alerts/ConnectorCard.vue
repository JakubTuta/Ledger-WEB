<template>
  <v-card
    variant="outlined"
    class="connector-card pa-3"
  >
    <div class="d-flex align-center mb-2">
      <v-avatar
        :color="color"
        size="32"
        class="mr-2"
      >
        <v-icon
          :icon="icon"
          size="18"
          color="white"
        />
      </v-avatar>

      <div class="flex-grow-1">
        <div class="text-subtitle-2 font-weight-bold">
          {{ label }}
        </div>

        <div class="text-caption text-medium-emphasis">
          {{ items.length }} connected
        </div>
      </div>

      <v-btn
        v-if="kind === 'in_app' && items.length === 0"
        size="small"
        variant="tonal"
        color="primary"
        :loading="loading"
        @click="emit('connect', kind)"
      >
        Connect
      </v-btn>

      <v-btn
        v-else-if="kind !== 'in_app'"
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-plus"
        @click="emit('connect', kind)"
      >
        Connect
      </v-btn>
    </div>

    <div
      v-if="items.length > 0"
      class="d-flex flex-column gap-1"
    >
      <div
        v-for="c in items"
        :key="c.id"
        class="d-flex align-center connector-row px-2 py-1"
      >
        <v-icon
          :icon="c.enabled
            ? 'mdi-check-circle'
            : 'mdi-pause-circle'"
          :color="c.enabled
            ? 'success'
            : 'grey'"
          size="16"
          class="mr-2"
        />

        <span class="text-caption flex-grow-1 text-truncate">{{ c.name }}</span>

        <v-icon
          v-if="testResult[c.id] === true"
          icon="mdi-check"
          color="success"
          size="16"
        />

        <v-icon
          v-else-if="testResult[c.id] === false"
          icon="mdi-close"
          color="error"
          size="16"
        />

        <v-btn
          v-if="kind !== 'in_app'"
          icon="mdi-pencil"
          variant="text"
          size="x-small"
          @click="emit('edit', c)"
        />

        <v-btn
          v-if="kind !== 'in_app'"
          icon="mdi-delete"
          variant="text"
          size="x-small"
          color="error"
          @click="emit('delete', c)"
        />
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import type { Connector, ConnectorKind } from '~/types/alerts'

const props = defineProps<{
  kind: ConnectorKind
  items: Connector[]
  loading?: boolean
}>()

const emit = defineEmits<{
  connect: [ConnectorKind]
  edit: [Connector]
  delete: [Connector]
}>()

const testResult = ref<Record<number, boolean>>({})

const meta = computed(() => ({
  webhook: { label: 'Webhook', icon: 'mdi-webhook', color: 'deep-purple' },
  email: { label: 'Email', icon: 'mdi-email', color: 'blue' },
  in_app: { label: 'In-app', icon: 'mdi-bell', color: 'amber-darken-2' },
}[props.kind]))

const label = computed(() => meta.value.label)
const icon = computed(() => meta.value.icon)
const color = computed(() => meta.value.color)
</script>

<style scoped>
.connector-card {
  min-width: 240px;
  flex: 1;
}

.connector-row {
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}
</style>
