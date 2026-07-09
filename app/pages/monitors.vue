<template>
  <div class="monitors-page pa-4">
    <v-card
      class="mb-3"
      elevation="1"
    >
      <v-card-text class="px-3 py-2">
        <div class="d-flex align-center ga-2 flex-wrap">
          <v-select
            v-model="selectedProjectId"
            label="Project"
            variant="outlined"
            density="compact"
            :items="projectOptions"
            item-title="name"
            item-value="id"
            hide-details
            style="max-width: 220px; min-width: 160px;"
          />

          <v-spacer />

          <v-btn
            icon="mdi-refresh"
            variant="text"
            density="comfortable"
            :loading="isLoading"
            title="Refresh"
            @click="load()"
          />

          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            :disabled="!projectIdNum"
            @click="createDialogOpen = true"
          >
            New monitor
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col
        v-for="monitor in monitors"
        :key="monitor.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card
          elevation="1"
          class="h-100"
        >
          <v-card-text>
            <div class="d-flex align-center mb-2">
              <v-icon
                :icon="monitor.last_ok === false
                  ? 'mdi-alert-circle'
                  : 'mdi-check-circle'"
                :color="monitor.last_ok === false
                  ? 'error'
                  : 'success'"
                class="mr-2"
              />

              <span class="font-weight-medium text-truncate">{{ monitor.name }}</span>

              <v-spacer />

              <v-chip
                size="small"
                variant="tonal"
              >
                {{ monitor.kind }}
              </v-chip>
            </div>

            <div class="text-caption text-medium-emphasis mb-2">
              {{ monitor.kind === 'http'
                ? monitor.target_url
                : 'Dead-man\'s-switch heartbeat' }}
            </div>

            <div class="d-flex align-center ga-4 mb-3">
              <div>
                <div class="text-caption text-medium-emphasis">
                  Uptime (24h)
                </div>

                <div class="text-h6">
                  {{ monitor.uptime_pct_24h.toFixed(1) }}%
                </div>
              </div>

              <div v-if="monitor.last_latency_ms !== null">
                <div class="text-caption text-medium-emphasis">
                  Latency
                </div>

                <div class="text-h6">
                  {{ monitor.last_latency_ms }}ms
                </div>
              </div>
            </div>

            <v-text-field
              v-if="monitor.kind === 'heartbeat' && monitor.token"
              :model-value="pingUrl(monitor.token)"
              label="Ping URL"
              readonly
              density="compact"
              variant="outlined"
              hide-details
              class="mb-2"
              append-inner-icon="mdi-content-copy"
              @click:append-inner="copyToClipboard(pingUrl(monitor.token))"
            />

            <div class="d-flex ga-2 justify-end">
              <v-switch
                v-model="monitor.enabled"
                density="compact"
                hide-details
                :label="monitor.enabled
                  ? 'Enabled'
                  : 'Disabled'"
                :loading="isActionLoading(monitor.id)"
                @update:model-value="toggleEnabled(monitor)"
              />

              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                color="error"
                :loading="isActionLoading(monitor.id)"
                @click="remove(monitor)"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col
        v-if="!monitors.length && !isLoading"
        cols="12"
      >
        <v-card
          elevation="1"
          class="text-medium-emphasis pa-8 text-center"
        >
          <v-icon
            icon="mdi-heart-pulse"
            size="48"
            class="mb-2"
          />

          <div>No monitors for this project yet.</div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog
      v-model="createDialogOpen"
      max-width="480"
    >
      <v-card>
        <v-card-title>New monitor</v-card-title>

        <v-card-text>
          <v-select
            v-model="form.kind"
            label="Kind"
            :items="[
              {'title': 'HTTP (uptime)',
               'value': 'http'},
              {'title': 'Heartbeat (dead-man\'s-switch)',
               'value': 'heartbeat'},
            ]"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-model="form.name"
            label="Name"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-if="form.kind === 'http'"
            v-model="form.target_url"
            label="Target URL"
            placeholder="https://example.com/health"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-model.number="form.interval_s"
            :label="form.kind === 'http'
              ? 'Check interval (seconds)'
              : 'Expected ping interval (seconds)'"
            type="number"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-if="form.kind === 'heartbeat'"
            v-model.number="form.grace_s"
            label="Grace period (seconds)"
            type="number"
            variant="outlined"
            density="compact"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn
            variant="text"
            @click="createDialogOpen = false"
          >
            Cancel
          </v-btn>

          <v-btn
            color="primary"
            :loading="creating"
            @click="submitCreate()"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { MonitorKind } from '~/types/monitors'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Monitors',
  robots: 'noindex, nofollow',
})

const monitorsStore = useMonitorsStore()
const projectsStore = useProjectsStore()
const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()

const projectOptions = computed(() => projectsStore.projects.map(p => ({ id: String(p.project_id), name: p.name })),
)

const selectedProjectId = ref<string | null>(
  typeof route.query.project === 'string'
    ? route.query.project
    : null,
)

const projectIdNum = computed(() => (selectedProjectId.value
  ? Number(selectedProjectId.value)
  : null),
)

const monitors = computed(() => (projectIdNum.value
  ? monitorsStore.getMonitorsForProject(projectIdNum.value)
  : []),
)
const isLoading = computed(() => (projectIdNum.value
  ? monitorsStore.isListLoading(projectIdNum.value)
  : false),
)
const isActionLoading = (id: number) => monitorsStore.isActionLoading(id)

const createDialogOpen = ref(false)
const creating = ref(false)
const form = ref<{ kind: MonitorKind, name: string, target_url: string, interval_s: number, grace_s: number }>({
  kind: 'http',
  name: '',
  target_url: '',
  interval_s: 60,
  grace_s: 0,
})

function pingUrl(token: string) {
  const serverUrl = runtimeConfig.public.serverUrl as string

  return `${serverUrl}/api/v1/monitors/${token}/ping`
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  }
  catch (error) {
    console.error('Clipboard write failed:', error)
  }
}

async function load() {
  if (!projectIdNum.value)
    return
  await monitorsStore.fetchMonitors(projectIdNum.value)
}

async function submitCreate() {
  if (!projectIdNum.value || !form.value.name)
    return

  creating.value = true
  try {
    const result = await monitorsStore.createMonitor({
      project_id: projectIdNum.value,
      kind: form.value.kind,
      name: form.value.name,
      target_url: form.value.kind === 'http'
        ? form.value.target_url
        : undefined,
      interval_s: form.value.interval_s,
      grace_s: form.value.kind === 'heartbeat'
        ? form.value.grace_s
        : undefined,
    })
    if (result.success) {
      createDialogOpen.value = false
      form.value = { kind: 'http', name: '', target_url: '', interval_s: 60, grace_s: 0 }
    }
  }
  finally {
    creating.value = false
  }
}

async function toggleEnabled(monitor: { id: number, enabled: boolean }) {
  if (!projectIdNum.value)
    return
  await monitorsStore.updateMonitor(projectIdNum.value, monitor.id, { enabled: monitor.enabled })
}

async function remove(monitor: { id: number }) {
  if (!projectIdNum.value)
    return
  await monitorsStore.deleteMonitor(projectIdNum.value, monitor.id)
}

watch(selectedProjectId, () => {
  if (selectedProjectId.value)
    router.replace({ query: { ...route.query, project: selectedProjectId.value } })
  load()
})

onMounted(async () => {
  if (!projectsStore.projects.length)
    await projectsStore.fetchProjects()

  if (!selectedProjectId.value && projectsStore.projects.length > 0)
    selectedProjectId.value = String(projectsStore.projects[0]!.project_id)
  else
    load()
})
</script>
