<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    icon="mdi-chart-timeline-variant"
    icon-color="info"
    @refresh="handleRefresh"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
  >
    <template #content>
      <div
        v-if="!panel.trace_id"
        class="d-flex flex-column align-center justify-center gap-2 pa-6"
      >
        <v-icon
          icon="mdi-chart-timeline-variant"
          size="36"
          color="medium-emphasis"
        />

        <span class="text-body-2 text-medium-emphasis">No trace ID configured</span>
      </div>

      <div
        v-else-if="isLoading"
        class="d-flex align-center justify-center pa-6"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </div>

      <TraceWaterfall
        v-else
        :spans="spans"
        class="pa-2"
        @select="openSpanDetail"
      />
    </template>
  </BasePanelCard>
</template>

<script setup lang="ts">
import type { Panel } from '~/types/panel'
import type { Project } from '~/types/project'
import type { Span } from '~/types/traces'

const props = defineProps<{
  panel: Panel
  project?: Project
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
}>()

const tracesStore = useTracesStore()
const { openTrace } = useTraceDrawer()

const spans = computed(() => (props.panel.trace_id
  ? tracesStore.getSpansForTrace(props.panel.trace_id).value
  : []),
)

const isLoading = computed(() => (props.panel.trace_id
  ? tracesStore.isDetailLoading(props.panel.trace_id).value
  : false),
)

function openSpanDetail(_span: Span) {
  if (props.panel.trace_id)
    openTrace(props.panel.trace_id)
}

async function handleRefresh() {
  if (props.panel.trace_id) {
    await tracesStore.fetchDetail(props.panel.trace_id, true)
  }
}

onMounted(() => {
  if (props.panel.trace_id) {
    tracesStore.fetchDetail(props.panel.trace_id)
  }
})
</script>
