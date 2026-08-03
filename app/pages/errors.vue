<template>
  <div class="errors-page pa-4">
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

          <v-tabs
            v-model="statusFilter"
            density="compact"
          >
            <v-tab value="unresolved">
              Unresolved
            </v-tab>

            <v-tab value="resolved">
              Resolved
            </v-tab>

            <v-tab value="ignored">
              Ignored
            </v-tab>

            <v-tab value="muted">
              Muted
            </v-tab>

            <v-tab :value="null">
              All
            </v-tab>
          </v-tabs>

          <v-spacer />

          <v-btn
            icon="mdi-refresh"
            variant="text"
            density="comfortable"
            :loading="isLoading"
            title="Refresh"
            @click="load()"
          />
        </div>
      </v-card-text>
    </v-card>

    <v-row no-gutters>
      <v-col
        cols="12"
        :md="selectedGroup
          ? 7
          : 12"
      >
        <v-card elevation="1">
          <v-table
            v-if="groups.length"
            hover
          >
            <thead>
              <tr>
                <th>Status</th>

                <th>Error</th>

                <th>Occurrences</th>

                <th>First seen</th>

                <th>Last seen</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="group in groups"
                :key="group.id"
                class="cursor-pointer"
                :class="{'bg-surface-light': selectedGroup?.id === group.id}"
                @click="selectGroup(group.id)"
              >
                <td>
                  <v-chip
                    size="small"
                    :color="ERROR_GROUP_STATUS_META[group.status].color"
                    :prepend-icon="ERROR_GROUP_STATUS_META[group.status].icon"
                    variant="tonal"
                  >
                    {{ ERROR_GROUP_STATUS_META[group.status].label }}
                  </v-chip>
                </td>

                <td>
                  <div class="font-weight-medium">
                    {{ group.error_type }}
                  </div>

                  <div class="text-caption text-medium-emphasis error-message-cell text-truncate">
                    {{ group.error_message }}
                  </div>
                </td>

                <td>{{ group.occurrence_count }}</td>

                <td>{{ formatTime(group.first_seen) }}</td>

                <td>{{ formatTime(group.last_seen) }}</td>
              </tr>
            </tbody>
          </v-table>

          <div
            v-else-if="!isLoading"
            class="text-medium-emphasis pa-8 text-center"
          >
            <v-icon
              icon="mdi-check-circle-outline"
              size="48"
              class="mb-2"
            />

            <div>No {{ statusFilter ?? '' }} errors for this project.</div>
          </div>

          <div
            v-else
            class="pa-8 text-center"
          >
            <v-progress-circular
              indeterminate
              size="24"
            />
          </div>

          <v-card-actions v-if="hasMore">
            <v-spacer />

            <v-btn
              variant="text"
              :loading="isLoading"
              @click="loadMore()"
            >
              Load more
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col
        v-if="selectedGroup"
        cols="12"
        md="5"
        class="pl-md-3 mt-md-0 mt-3"
      >
        <v-card elevation="1">
          <v-card-title class="d-flex align-center">
            <span class="text-truncate">{{ selectedGroup.error_type }}</span>

            <v-spacer />

            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="selectedGroupId = null"
            />
          </v-card-title>

          <v-card-text>
            <div class="d-flex ga-2 mb-3 flex-wrap">
              <v-btn
                v-for="status in ACTIONABLE_STATUSES"
                :key="status"
                size="small"
                variant="outlined"
                :color="ERROR_GROUP_STATUS_META[status].color"
                :loading="isActionLoading(selectedGroup.id)"
                :disabled="selectedGroup.status === status"
                @click="setStatus(status)"
              >
                {{ ERROR_GROUP_STATUS_META[status].label }}
              </v-btn>
            </div>

            <div
              v-if="detail?.occurrence_sparkline?.length"
              class="mb-4"
            >
              <div class="text-caption text-medium-emphasis mb-1">
                Occurrences (24h)
              </div>

              <VChart
                :option="sparklineOption"
                style="height: 120px;"
                autoresize
              />
            </div>

            <div
              v-if="selectedGroup.error_message"
              class="mb-3"
            >
              <div class="text-caption text-medium-emphasis">
                Message
              </div>

              <div class="text-body-2">
                {{ selectedGroup.error_message }}
              </div>
            </div>

            <div v-if="detail?.sample_stack_trace">
              <div class="text-caption text-medium-emphasis mb-1">
                Stack trace
              </div>

              <pre class="detail-pre">{{ detail.sample_stack_trace }}</pre>
            </div>

            <div
              v-if="detail?.sample_log?.client_channel || detail?.sample_log?.client_country"
              class="mt-3"
            >
              <div class="text-caption text-medium-emphasis mb-1">
                Caller (sample occurrence)
              </div>

              <div class="d-flex flex-wrap gap-2">
                <v-chip
                  v-if="detail.sample_log.client_channel"
                  size="x-small"
                  variant="outlined"
                >
                  <v-icon
                    :icon="channelIcon(detail.sample_log.client_channel)"
                    start
                  />
                  {{ detail.sample_log.client_channel }}
                </v-chip>

                <v-chip
                  v-if="detail.sample_log.client_country"
                  size="x-small"
                  variant="outlined"
                >
                  <v-icon
                    icon="mdi-flag-outline"
                    start
                  />
                  {{ detail.sample_log.client_country }}
                </v-chip>
              </div>
            </div>

            <div
              v-if="detailLoading"
              class="pa-4 text-center"
            >
              <v-progress-circular
                indeterminate
                size="20"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import type { ErrorGroupStatus } from '~/types/errorGroups'
import VChart from 'vue-echarts'
import { ERROR_GROUP_STATUS_META } from '~/types/errorGroups'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Errors',
  robots: 'noindex, nofollow',
})

const errorsStore = useErrorsStore()
const projectsStore = useProjectsStore()
const route = useRoute()
const router = useRouter()

const ACTIONABLE_STATUSES: ErrorGroupStatus[] = ['unresolved', 'resolved', 'ignored', 'muted']

const projectOptions = computed(() => projectsStore.projects.map(p => ({ id: String(p.project_id), name: p.name })),
)

const selectedProjectId = ref<string | null>(
  typeof route.query.project === 'string'
    ? route.query.project
    : null,
)

const statusFilter = ref<ErrorGroupStatus | null>('unresolved')
const selectedGroupId = ref<number | null>(null)

const projectIdNum = computed(() => (selectedProjectId.value
  ? Number(selectedProjectId.value)
  : null),
)

const groups = computed(() => (projectIdNum.value
  ? errorsStore.getGroupsForProject(projectIdNum.value)
  : []),
)
const hasMore = computed(() => (projectIdNum.value
  ? errorsStore.getHasMoreForProject(projectIdNum.value)
  : false),
)
const isLoading = computed(() => (projectIdNum.value
  ? errorsStore.isListLoading(projectIdNum.value)
  : false),
)

const selectedGroup = computed(() => groups.value.find(g => g.id === selectedGroupId.value) ?? null,
)
const detail = computed(() => (selectedGroupId.value
  ? errorsStore.getDetail(selectedGroupId.value)
  : undefined),
)
const detailLoading = computed(() => (selectedGroupId.value
  ? errorsStore.isDetailLoading(selectedGroupId.value)
  : false),
)
const isActionLoading = (id: number) => errorsStore.isActionLoading(id)

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}

async function load() {
  if (!projectIdNum.value)
    return
  await errorsStore.fetchErrorGroups(projectIdNum.value, { status: statusFilter.value })
}

async function loadMore() {
  if (!projectIdNum.value)
    return
  await errorsStore.fetchErrorGroups(projectIdNum.value, { status: statusFilter.value, append: true })
}

async function selectGroup(id: number) {
  selectedGroupId.value = id
  if (projectIdNum.value)
    await errorsStore.fetchErrorGroupDetail(projectIdNum.value, id)
}

async function setStatus(status: ErrorGroupStatus) {
  if (!projectIdNum.value || !selectedGroup.value)
    return
  await errorsStore.updateErrorGroupStatus(projectIdNum.value, selectedGroup.value.id, { status })
}

const sparklineOption = computed(() => {
  const buckets = detail.value?.occurrence_sparkline ?? []

  return {
    grid: { left: 0, right: 0, top: 4, bottom: 4 },
    xAxis: { type: 'category', show: false, data: buckets.map(b => b.bucket) },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'bar',
      data: buckets.map(b => b.count),
      itemStyle: { color: '#ef5350' },
    }],
    tooltip: { trigger: 'axis' },
  }
})

watch(selectedProjectId, () => {
  selectedGroupId.value = null
  if (selectedProjectId.value)
    router.replace({ query: { ...route.query, project: selectedProjectId.value } })
  load()
})

watch(statusFilter, () => {
  selectedGroupId.value = null
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

<style scoped>
.error-message-cell {
  max-width: 360px;
}

.detail-pre {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 6px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.3;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
