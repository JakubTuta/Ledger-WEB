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
          icon="mdi-send-outline"
          variant="text"
          size="x-small"
          :loading="testing[c.id]"
          @click="runTest(c)"
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

    <v-snackbar
      v-model="snackbarOpen"
      timeout="3000"
      :color="snackbarColor"
      location="bottom right"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </v-card>
</template>

<script setup lang="ts">
import type { Connector, ConnectorKind } from '~/types/alerts'
import { connectorMeta } from '~/types/alerts'

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

const alertsStore = useAlertsStore()

const testResult = ref<Record<number, boolean>>({})
const testing = ref<Record<number, boolean>>({})
const snackbarOpen = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const meta = computed(() => connectorMeta(props.kind))

const label = computed(() => meta.value.label)
const icon = computed(() => meta.value.icon)
const color = computed(() => meta.value.color)

async function runTest(connector: Connector) {
  testing.value = { ...testing.value, [connector.id]: true }
  const result = await alertsStore.testConnector(connector.id)
  testing.value = { ...testing.value, [connector.id]: false }
  testResult.value = { ...testResult.value, [connector.id]: result.success }

  snackbarColor.value = result.success
    ? 'success'
    : 'error'
  snackbarMessage.value = result.success
    ? `Test notification sent via ${connector.name}`
    : (result.error || 'Test notification failed')
  snackbarOpen.value = true
}
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
