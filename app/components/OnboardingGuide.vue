<template>
  <v-card class="pa-6">
    <div class="d-flex align-center ga-3 mb-2">
      <v-avatar
        color="primary"
        size="44"
      >
        <v-icon
          icon="mdi-rocket-launch-outline"
          size="24"
        />
      </v-avatar>

      <div>
        <div class="text-h6">
          Welcome to Ledger
        </div>

        <div class="text-body-2 text-medium-emphasis">
          Follow these steps to start monitoring your app.
        </div>
      </div>
    </div>

    <v-progress-linear
      :model-value="progress"
      color="primary"
      height="6"
      rounded
      class="my-4"
    />

    <v-timeline
      side="end"
      align="start"
      density="compact"
      truncate-line="both"
      class="mt-2"
    >
      <v-timeline-item
        v-for="step in steps"
        :key="step.key"
        :dot-color="step.done
          ? 'success'
          : step.active
            ? 'primary'
            : 'surface-variant'"
        :icon="step.done
          ? 'mdi-check'
          : step.icon"
        size="small"
        fill-dot
      >
        <div class="d-flex flex-column ga-1">
          <div
            class="text-subtitle-2"
            :class="step.done
              ? 'text-medium-emphasis'
              : ''"
          >
            {{ step.title }}
          </div>

          <div class="text-body-2 text-medium-emphasis">
            {{ step.description }}
          </div>

          <div
            v-if="step.active && step.action"
            class="mt-2"
          >
            <v-btn
              :color="step.action.color ?? 'primary'"
              :prepend-icon="step.action.icon"
              :variant="step.action.variant ?? 'flat'"
              size="small"
              :disabled="step.action.disabled"
              @click="step.action.handler"
            >
              {{ step.action.label }}
            </v-btn>
          </div>
        </div>
      </v-timeline-item>
    </v-timeline>
  </v-card>
</template>

<script setup lang="ts">
const props = defineProps<{
  selectedProjectId: string | null
}>()

const emit = defineEmits<{
  addPanel: []
}>()

const router = useRouter()
const projectsStore = useProjectsStore()
const panelsStore = usePanelsStore()

const hasProject = computed(() => projectsStore.hasData)

const hasTab = computed(() => {
  if (!props.selectedProjectId)
    return false

  return panelsStore.tabsForProject(props.selectedProjectId).length > 0
})

const hasPanel = computed(() => panelsStore.hasData)

interface StepAction {
  label: string
  icon: string
  handler: () => void
  color?: string
  variant?: 'flat' | 'outlined' | 'tonal' | 'text'
  disabled?: boolean
}

interface Step {
  key: string
  title: string
  description: string
  icon: string
  done: boolean
  active: boolean
  action?: StepAction
}

const steps = computed<Step[]>(() => {
  const list: Omit<Step, 'active'>[] = [
    {
      key: 'project',
      title: 'Create or join a project',
      description: 'A project groups the logs, errors and metrics from one app or environment.',
      icon: 'mdi-folder-plus-outline',
      done: hasProject.value,
      action: {
        label: 'Go to Projects',
        icon: 'mdi-folder-multiple',
        handler: () => router.push('/settings'),
      },
    },
    {
      key: 'connect',
      title: 'Connect your app',
      description: 'Create an API key and add the SDK to your backend so data starts flowing in.',
      icon: 'mdi-key-outline',
      done: false,
      action: {
        label: 'API key setup',
        icon: 'mdi-key',
        variant: 'outlined',
        handler: () => router.push('/settings'),
      },
    },
    {
      key: 'dashboard',
      title: 'Add a dashboard tab',
      description: 'Use the + next to the tab bar to start from a template or a blank dashboard.',
      icon: 'mdi-tab-plus',
      done: hasTab.value,
    },
    {
      key: 'panels',
      title: 'Add panels',
      description: 'Add panels to visualize metrics, browse logs, errors and traces.',
      icon: 'mdi-view-grid-plus-outline',
      done: hasPanel.value,
      action: {
        label: 'Add Panel',
        icon: 'mdi-plus',
        disabled: !props.selectedProjectId,
        handler: () => emit('addPanel'),
      },
    },
  ]

  const firstUndoneIndex = list.findIndex(s => !s.done)

  return list.map((s, i) => ({
    ...s,
    active: i === firstUndoneIndex,
  }))
})

const progress = computed(() => {
  const done = steps.value.filter(s => s.done).length

  return Math.round((done / steps.value.length) * 100)
})
</script>
