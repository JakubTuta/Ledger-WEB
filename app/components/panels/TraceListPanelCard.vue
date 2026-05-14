<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    icon="mdi-format-list-text"
    icon-color="info"
    @refresh="handleRefresh"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
  >
    <template #content>
      <div
        v-if="isLoading && traces.length === 0"
        class="d-flex align-center justify-center pa-6"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </div>

      <TraceList
        v-else
        :traces="traces"
        :is-loading="isLoading"
      />
    </template>

    <template #footer>
      <div class="d-flex align-center gap-2 pa-2">
        <v-chip
          v-if="panel.service_filter"
          size="x-small"
          variant="flat"
          color="info"
        >
          {{ panel.service_filter }}
        </v-chip>

        <v-chip
          v-if="panel.has_error === true"
          size="x-small"
          variant="flat"
          color="error"
        >
          errors only
        </v-chip>

        <v-chip
          v-if="panel.min_duration_ms"
          size="x-small"
          variant="flat"
        >
          &gt;{{ panel.min_duration_ms }}ms
        </v-chip>

        <v-spacer />

        <v-btn
          icon="mdi-cog"
          variant="text"
          size="x-small"
          @click="configOpen = true"
        />
      </div>
    </template>
  </BasePanelCard>

  <TraceListPanelEditor
    v-model="configOpen"
    :panel="panel"
    @saved="handleRefresh"
  />
</template>

<script setup lang="ts">
import type { Panel } from '~/types/panel'
import type { Project } from '~/types/project'

const props = defineProps<{
  panel: Panel
  project?: Project
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
}>()

const configOpen = ref(false)

const tracesStore = useTracesStore()

const traces = computed(() => tracesStore.getListForPanel(props.panel.id).value)
const isLoading = computed(() => tracesStore.isListLoading(props.panel.id).value)

function buildFilters() {
  const now = new Date()

  return {
    project_id: props.panel.project_id,
    service: props.panel.service_filter,
    operation: props.panel.operation_filter,
    min_duration_ms: props.panel.min_duration_ms,
    has_error: props.panel.has_error,
    limit: props.panel.limit ?? 50,
    from: props.panel.periodFrom || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    to: props.panel.periodTo || now.toISOString(),
  }
}

async function handleRefresh() {
  await tracesStore.fetchList(props.panel.id, buildFilters(), true)
}

onMounted(() => {
  tracesStore.fetchList(props.panel.id, buildFilters())
})
</script>
