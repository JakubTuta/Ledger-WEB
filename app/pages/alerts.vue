<template>
  <v-container
    fluid
    class="pa-4"
  >
    <v-card
      class="pa-4"
      elevation="1"
    >
      <div class="d-flex align-center mb-2">
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

      <!-- Connectors -->
      <div class="text-overline mb-2">
        Channels
      </div>

      <div class="d-flex mb-6 flex-wrap gap-3">
        <ConnectorCard
          v-for="kind in connectorKinds"
          :key="kind"
          :kind="kind"
          :items="connectorsByKind(kind)"
          :loading="connectorsLoading"
          @connect="openConnectDialog"
          @edit="editConnector"
          @delete="confirmDeleteConnector"
        />
      </div>
      <!-- /connectors -->

      <!-- Alert rules -->
      <div class="d-flex align-center mb-2">
        <span class="text-overline">Alert rules</span>

        <v-spacer />

        <v-btn
          color="primary"
          size="small"
          prepend-icon="mdi-plus"
          :disabled="!selectedProjectId"
          @click="openRuleDialog()"
        >
          New rule
        </v-btn>
      </div>

      <v-card
        variant="outlined"
        class="mb-6"
      >
        <RuleList
          :rules="rules"
          :connectors="connectors"
          :loading="rulesLoading"
          @edit="openRuleDialog"
          @delete="confirmDeleteRule"
          @toggle="handleToggleRule"
        />
      </v-card>

      <!-- History -->
      <div class="text-overline mb-2">
        History
      </div>

      <v-card
        variant="outlined"
      >
        <HistoryList
          :events="history"
          :has-more="historyHasMore"
          :loading="historyLoading"
          @load-more="loadMoreHistory"
        />
      </v-card>
    </v-card>

    <!-- Connect dialog -->
    <ConnectDialog
      v-model="connectDialogOpen"
      :kind="connectDialogKind"
      :connector="editingConnector"
      @saved="onConnectorSaved"
    />

    <!-- Rule dialog -->
    <RuleDialog
      v-model="ruleDialogOpen"
      :default-project-id="selectedProjectId"
      :rule="editingRule"
      @saved="onRuleSaved"
    />

    <!-- Delete confirm -->
    <v-dialog
      v-model="deleteConfirmOpen"
      max-width="360"
    >
      <v-card>
        <v-card-title class="pa-4">
          Delete {{ deleteTarget?.type }}?
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
import type { AlertRule, Connector, ConnectorKind } from '~/types/alerts'
import ConnectDialog from '~/components/alerts/ConnectDialog.vue'
import ConnectorCard from '~/components/alerts/ConnectorCard.vue'
import HistoryList from '~/components/alerts/HistoryList.vue'
import RuleDialog from '~/components/alerts/RuleDialog.vue'
import RuleList from '~/components/alerts/RuleList.vue'

definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: 'Alerts',
  robots: 'noindex, nofollow',
})

const alertsStore = useAlertsStore()
const projectsStore = useProjectsStore()
const { projects } = storeToRefs(projectsStore)
const { connectors } = storeToRefs(alertsStore)

const connectorKinds: ConnectorKind[] = ['webhook', 'email', 'in_app']
const selectedProjectId = ref<number | null>(null)

const connectDialogOpen = ref(false)
const connectDialogKind = ref<ConnectorKind>('webhook')
const editingConnector = ref<Connector | undefined>()

const ruleDialogOpen = ref(false)
const editingRule = ref<AlertRule | undefined>()

const deleteConfirmOpen = ref(false)
const deleteTarget = ref<{ type: 'rule' | 'connector', id: number } | null>(null)
const deleting = ref(false)

const projectOptions = computed(() => projects.value.map(p => ({ id: p.project_id, name: p.name })))

const connectorsLoading = computed(() => alertsStore.connectorsLoading)

const rules = computed(() => (selectedProjectId.value
  ? alertsStore.getRulesForProject(selectedProjectId.value).value
  : []))

const rulesLoading = computed(() => (selectedProjectId.value
  ? alertsStore.rulesLoading.has(selectedProjectId.value)
  : false))

const history = computed(() => (selectedProjectId.value
  ? alertsStore.getHistoryForProject(selectedProjectId.value).value
  : []))

const historyLoading = computed(() => (selectedProjectId.value
  ? alertsStore.historyLoading.has(selectedProjectId.value)
  : false))

const historyHasMore = computed(() => (selectedProjectId.value
  ? alertsStore.historyHasMore.get(selectedProjectId.value) ?? false
  : false))

function connectorsByKind(kind: ConnectorKind): Connector[] {
  return connectors.value.filter(c => c.kind === kind)
}

function openConnectDialog(kind: ConnectorKind) {
  editingConnector.value = undefined
  connectDialogKind.value = kind
  connectDialogOpen.value = true
}

function editConnector(connector: Connector) {
  editingConnector.value = connector
  connectDialogKind.value = connector.kind
  connectDialogOpen.value = true
}

function confirmDeleteConnector(connector: Connector) {
  deleteTarget.value = { type: 'connector', id: connector.id }
  deleteConfirmOpen.value = true
}

function openRuleDialog(rule?: AlertRule) {
  editingRule.value = rule
  ruleDialogOpen.value = true
}

function confirmDeleteRule(rule: AlertRule) {
  deleteTarget.value = { type: 'rule', id: rule.id }
  deleteConfirmOpen.value = true
}

async function executeDelete() {
  if (!deleteTarget.value)
    return
  deleting.value = true
  try {
    if (deleteTarget.value.type === 'connector') {
      await alertsStore.deleteConnector(deleteTarget.value.id)
    }
    else if (selectedProjectId.value) {
      await alertsStore.deleteRule(deleteTarget.value.id, selectedProjectId.value)
    }
    deleteConfirmOpen.value = false
  }
  finally {
    deleting.value = false
  }
}

async function handleToggleRule(rule: AlertRule, enabled: boolean) {
  if (selectedProjectId.value)
    await alertsStore.toggleRule(rule.id, selectedProjectId.value, enabled)
}

function onConnectorSaved() {
  alertsStore.refreshConnectors()
}

function onRuleSaved() {
  if (selectedProjectId.value)
    alertsStore.fetchRules(selectedProjectId.value, true)
}

function loadMoreHistory() {
  if (selectedProjectId.value)
    alertsStore.fetchHistory(selectedProjectId.value, { append: true })
}

watch(selectedProjectId, (id) => {
  if (id) {
    alertsStore.fetchRules(id)
    alertsStore.fetchHistory(id)
  }
})

watch(projects, (list) => {
  if (list.length > 0 && !selectedProjectId.value)
    selectedProjectId.value = list[0]!.project_id
}, { immediate: true })

onMounted(() => {
  projectsStore.fetchProjects()
  alertsStore.fetchConnectors()
})
</script>
