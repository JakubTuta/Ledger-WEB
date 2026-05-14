<template>
  <v-container
    fluid
    class="pa-4"
  >
    <div class="d-flex align-center mb-4">
      <v-icon
        icon="mdi-bell-alert"
        class="mr-2"
      />

      <span class="text-h5 font-weight-bold">Alerts</span>

      <v-spacer />

      <v-select
        v-model="selectedProjectId"
        label="Project"
        variant="outlined"
        density="compact"
        :items="projectOptions"
        item-title="name"
        item-value="id"
        hide-details
        style="max-width: 230px"
      />
    </div>

    <v-card
      elevation="1"
    >
      <v-tabs
        v-model="activeTab"
        color="primary"
      >
        <v-tab value="rules">
          <v-icon
            icon="mdi-bell-check"
            class="mr-2"
          />
          Rules
        </v-tab>

        <v-tab value="channels">
          <v-icon
            icon="mdi-send-circle"
            class="mr-2"
          />
          Channels
        </v-tab>
      </v-tabs>

      <v-divider />

      <v-window v-model="activeTab">
        <!-- Rules tab -->
        <v-window-item value="rules">
          <div class="d-flex justify-end pa-3">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              size="small"
              @click="openRuleEditor()"
            >
              New rule
            </v-btn>
          </div>

          <v-data-table
            :headers="ruleHeaders"
            :items="rules"
            :loading="rulesLoading"
            :items-per-page="-1"
            hide-default-footer
            no-data-text="No alert rules yet"
            item-value="id"
          >
            <template #item.last_state="{item}">
              <v-chip
                :color="statusColor(item.last_state)"
                size="small"
                variant="flat"
              >
                {{ item.last_state }}
              </v-chip>
            </template>

            <template #item.enabled="{item}">
              <v-switch
                :model-value="item.enabled"
                color="primary"
                density="compact"
                hide-details
                @update:model-value="handleToggleRule(item, $event)"
              />
            </template>

            <template #item.last_fired_at="{item}">
              <span class="text-caption">
                {{ item.last_fired_at
                  ? formatRelative(item.last_fired_at)
                  : 'Never' }}
              </span>
            </template>

            <template #item.actions="{item}">
              <div class="d-flex gap-1">
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="x-small"
                  @click="openRuleEditor(item)"
                />

                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="x-small"
                  color="error"
                  @click="confirmDeleteRule(item)"
                />
              </div>
            </template>
          </v-data-table>
        </v-window-item>

        <!-- Channels tab -->
        <v-window-item value="channels">
          <div class="d-flex justify-end pa-3">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              size="small"
              @click="openChannelEditor()"
            >
              New channel
            </v-btn>
          </div>

          <v-data-table
            :headers="channelHeaders"
            :items="channels"
            :loading="channelsLoading"
            :items-per-page="-1"
            hide-default-footer
            no-data-text="No alert channels yet"
            item-value="id"
          >
            <template #item.kind="{item}">
              <v-chip
                :prepend-icon="channelIcon(item.kind)"
                size="small"
                variant="flat"
              >
                {{ item.kind }}
              </v-chip>
            </template>

            <template #item.config="{item}">
              <span class="text-caption">{{ maskTarget(item) }}</span>
            </template>

            <template #item.enabled="{item}">
              <v-switch
                :model-value="item.enabled"
                color="primary"
                density="compact"
                hide-details
                :disabled="item.kind === 'in_app'"
                @update:model-value="handleToggleChannel(item, $event)"
              />
            </template>

            <template #item.actions="{item}">
              <div class="d-flex align-center gap-1">
                <v-btn
                  variant="flat"
                  size="x-small"
                  :loading="testingChannelId === item.id"
                  @click="handleTestChannel(item)"
                >
                  Test
                </v-btn>

                <v-icon
                  v-if="testResults[item.id]?.success === true"
                  icon="mdi-check-circle"
                  color="success"
                  size="18"
                />

                <v-icon
                  v-else-if="testResults[item.id]?.success === false"
                  icon="mdi-close-circle"
                  color="error"
                  size="18"
                />

                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="x-small"
                  :disabled="item.kind === 'in_app'"
                  @click="openChannelEditor(item)"
                />

                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="x-small"
                  color="error"
                  :disabled="item.kind === 'in_app'"
                  @click="confirmDeleteChannel(item)"
                />
              </div>
            </template>
          </v-data-table>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Rule editor dialog -->
    <AlertsRuleEditorDialog
      v-if="selectedProjectId"
      v-model="ruleEditorOpen"
      :project-id="selectedProjectId"
      :rule="editingRule"
      @saved="onRuleSaved"
    />

    <!-- Channel editor dialog -->
    <AlertsChannelEditorDialog
      v-if="selectedProjectId"
      v-model="channelEditorOpen"
      :project-id="selectedProjectId"
      :channel="editingChannel"
      @saved="onChannelSaved"
    />

    <!-- Delete confirm -->
    <v-dialog
      v-model="deleteConfirmOpen"
      max-width="360"
    >
      <v-card>
        <v-card-title class="pa-4">
          Delete {{ deletingItem?.type === 'rule'
            ? 'Rule'
            : 'Channel' }}?
        </v-card-title>

        <v-card-text>
          This action cannot be undone.
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn
            variant="text"
            @click="deleteConfirmOpen = false"
          >
            Cancel
          </v-btn>

          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            @click="executeDelete"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import type { AlertChannel, AlertRule } from '~/types/alerts'

definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: 'Alerts',
  robots: 'noindex, nofollow',
})

const alertsStore = useAlertsStore()
const projectsStore = useProjectsStore()
const { projects } = storeToRefs(projectsStore)

const activeTab = ref('rules')
const selectedProjectId = ref<number | null>(null)

const selectedProject = computed(() => projects.value.find(p => p.project_id === selectedProjectId.value) ?? null,
)

const ruleEditorOpen = ref(false)
const editingRule = ref<AlertRule | undefined>()
const channelEditorOpen = ref(false)
const editingChannel = ref<AlertChannel | undefined>()
const deleteConfirmOpen = ref(false)
const deletingItem = ref<{ type: 'rule' | 'channel', id: number } | null>(null)
const deleting = ref(false)
const testingChannelId = ref<number | null>(null)
const testResults = ref<Record<number, { success: boolean }>>({})

const projectOptions = computed(() => projects.value.map(p => ({ id: p.project_id, name: p.name })),
)

const rules = computed(() => (selectedProjectId.value
  ? alertsStore.getRulesForProject(selectedProjectId.value).value
  : []),
)

const channels = computed(() => (selectedProjectId.value
  ? alertsStore.getChannelsForProject(selectedProjectId.value).value
  : []),
)

const rulesLoading = computed(() => (selectedProjectId.value
  ? alertsStore.rulesLoading.has(selectedProjectId.value)
  : false),
)

const channelsLoading = computed(() => (selectedProjectId.value
  ? alertsStore.channelsLoading.has(selectedProjectId.value)
  : false),
)

const ruleHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Metric', key: 'metric' },
  { title: 'Condition', key: 'comparator', value: (r: AlertRule) => `${r.comparator} ${r.threshold}` },
  { title: 'Last fired', key: 'last_fired_at' },
  { title: 'Status', key: 'last_state' },
  { title: 'Enabled', key: 'enabled' },
  { title: '', key: 'actions', sortable: false },
]

const channelHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Kind', key: 'kind' },
  { title: 'Target', key: 'config' },
  { title: 'Enabled', key: 'enabled' },
  { title: '', key: 'actions', sortable: false },
]

function statusColor(status: string): string {
  const map: Record<string, string> = { firing: 'error', ok: 'success', disabled: 'default' }

  return map[status] ?? 'default'
}

function channelIcon(kind: string): string {
  const map: Record<string, string> = {
    in_app: 'mdi-bell',
    email: 'mdi-email',
    webhook: 'mdi-webhook',
  }

  return map[kind] ?? 'mdi-send'
}

function maskTarget(channel: AlertChannel): string {
  let cfg: Record<string, string> = {}
  try { cfg = JSON.parse(channel.config) }
  catch { /* noop */ }

  if (channel.kind === 'email') {
    const addr = cfg.address ?? cfg.email ?? ''
    if (!addr)
      return '—'
    const [user, domain] = addr.split('@')

    return `${user?.slice(0, 2) ?? ''}***@${domain}`
  }
  if (channel.kind === 'webhook') {
    const url = cfg.url ?? ''
    if (!url)
      return '—'
    try {
      return new URL(url).hostname
    }
    catch {
      return url.slice(0, 30)
    }
  }

  return '—'
}

function formatRelative(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0)
      return `${days}d ago`
    if (hours > 0)
      return `${hours}h ago`
    if (mins > 0)
      return `${mins}m ago`

    return 'Just now'
  }
  catch {
    return ts
  }
}

function openRuleEditor(rule?: AlertRule) {
  editingRule.value = rule
  ruleEditorOpen.value = true
}

function openChannelEditor(channel?: AlertChannel) {
  editingChannel.value = channel
  channelEditorOpen.value = true
}

function confirmDeleteRule(rule: AlertRule) {
  deletingItem.value = { type: 'rule', id: rule.id }
  deleteConfirmOpen.value = true
}

function confirmDeleteChannel(channel: AlertChannel) {
  deletingItem.value = { type: 'channel', id: channel.id }
  deleteConfirmOpen.value = true
}

async function executeDelete() {
  if (!deletingItem.value || !selectedProjectId.value)
    return
  deleting.value = true
  try {
    if (deletingItem.value.type === 'rule') {
      await alertsStore.deleteRule(deletingItem.value.id, selectedProjectId.value)
    }
    else {
      await alertsStore.deleteChannel(deletingItem.value.id, selectedProjectId.value)
    }
    deleteConfirmOpen.value = false
  }
  finally {
    deleting.value = false
  }
}

async function handleToggleRule(rule: AlertRule, enabled: boolean) {
  if (!selectedProjectId.value)
    return
  await alertsStore.toggleRule(rule.id, selectedProjectId.value, enabled)
}

async function handleToggleChannel(channel: AlertChannel, enabled: boolean) {
  if (!selectedProjectId.value)
    return
  await alertsStore.updateChannel(channel.id, selectedProjectId.value, { enabled })
}

async function handleTestChannel(channel: AlertChannel) {
  testingChannelId.value = channel.id
  const result = await alertsStore.testChannel(channel.id)
  testResults.value = { ...testResults.value, [channel.id]: result }
  testingChannelId.value = null
  setTimeout(() => {
    const r = { ...testResults.value }
    delete r[channel.id]
    testResults.value = r
  }, 5000)
}

function onRuleSaved() {
  if (selectedProjectId.value) {
    alertsStore.fetchRules(selectedProjectId.value, true)
  }
}

function onChannelSaved() {
  if (selectedProjectId.value) {
    alertsStore.fetchChannels(selectedProjectId.value, true)
  }
}

watch(selectedProjectId, (id) => {
  if (id) {
    alertsStore.fetchRules(id)
    alertsStore.fetchChannels(id)
  }
})

watch(projects, (list) => {
  if (list.length > 0 && !selectedProjectId.value) {
    selectedProjectId.value = list[0]!.project_id
  }
}, { immediate: true })

onMounted(() => {
  projectsStore.fetchProjects()
})
</script>
