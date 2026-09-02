<template>
  <div class="d-flex flex-column h-100">
    <!-- New key reveal banner (shown immediately after regeneration) -->
    <v-alert
      v-if="newlyCreatedKey"
      type="warning"
      variant="flat"
      closable
      class="mb-4"
      @click:close="dismissNewKey"
    >
      <div class="text-subtitle-2 mb-3">
        Save this key now — it will not be shown again.
      </div>

      <v-text-field
        :model-value="newlyCreatedKey.full_key"
        label="New API Key"
        variant="outlined"
        readonly
        density="compact"
        :type="showNewKey
          ? 'text'
          : 'password'"
      >
        <template #append-inner>
          <v-btn
            :icon="showNewKey
              ? 'mdi-eye-off'
              : 'mdi-eye'"
            variant="text"
            size="small"
            @click="showNewKey = !showNewKey"
          />

          <v-btn
            icon="mdi-content-copy"
            variant="text"
            size="small"
            @click="copyNewKey"
          />
        </template>
      </v-text-field>
    </v-alert>

    <!-- Revocation warning banner -->
    <v-alert
      v-else-if="revokedApiKeys.length > 0"
      type="warning"
      variant="tonal"
      prepend-icon="mdi-key-alert"
      class="mb-4"
    >
      {{ revokedApiKeys.length }} API key{{ revokedApiKeys.length > 1
        ? 's were'
        : ' was' }} revoked due to a security update. Use Regenerate to issue replacement keys.
    </v-alert>

    <div class="mb-4">
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="handleCreateKey"
      >
        Create New API Key
      </v-btn>
    </div>

    <v-list
      v-if="allApiKeys.length > 0"
      lines="three"
    >
      <v-list-item
        v-for="apiKey in allApiKeys"
        :key="apiKey.key_id"
        class="mb-2"
      >
        <v-list-item-title>{{ apiKey.name }}</v-list-item-title>

        <v-list-item-subtitle class="mt-1">
          <v-row dense>
            <v-col
              cols="12"
              sm="4"
            >
              <span class="text-caption text-grey">Project:</span>

              <span class="ml-1">{{ getProjectName(apiKey.project_id) }}</span>
            </v-col>

            <v-col
              cols="12"
              sm="4"
            >
              <span class="text-caption text-grey">Status:</span>

              <v-chip
                :color="apiKey.status === 'active'
                  ? 'success'
                  : 'error'"
                size="x-small"
                class="ml-1"
              >
                {{ apiKey.status }}
              </v-chip>
            </v-col>

            <v-col
              cols="12"
              sm="4"
            >
              <span class="text-caption text-grey">Created:</span>

              <span class="ml-1">{{ formatDate(apiKey.created_at) }}</span>
            </v-col>
          </v-row>
        </v-list-item-subtitle>

        <template #append>
          <v-tooltip text="Regenerate key">
            <template #activator="{'props': tooltipProps}">
              <v-btn
                v-bind="tooltipProps"
                icon="mdi-key-refresh"
                variant="text"
                color="primary"
                :disabled="regenerateLoading"
                @click="handleRegenerateClick(apiKey)"
              />
            </template>
          </v-tooltip>

          <v-tooltip
            v-if="apiKey.status === 'active'"
            text="Revoke key"
          >
            <template #activator="{'props': tooltipProps}">
              <v-btn
                v-bind="tooltipProps"
                icon="mdi-delete"
                variant="text"
                color="error"
                :disabled="revokeLoading"
                @click="handleRevokeClick(apiKey)"
              />
            </template>
          </v-tooltip>
        </template>
      </v-list-item>
    </v-list>

    <v-alert
      v-else
      type="info"
      variant="flat"
    >
      No API keys found. Create one to get started.
    </v-alert>

    <ConfirmDialog
      v-model="showRevokeDialog"
      title="Revoke API Key"
      :message="`Are you sure you want to revoke '${selectedKey?.name}'? This action cannot be undone and the key will immediately stop working.`"
      confirm-text="Revoke"
      cancel-text="Cancel"
      :loading="revokeLoading"
      @confirm="handleRevokeConfirm"
      @cancel="handleRevokeCancel"
    />

    <ConfirmDialog
      v-model="showRegenerateDialog"
      title="Regenerate API Key"
      :message="`This will revoke '${selectedKey?.name}' and issue a new key. Save the new key immediately — it will not be shown again.`"
      confirm-text="Regenerate"
      cancel-text="Cancel"
      :loading="regenerateLoading"
      @confirm="handleRegenerateConfirm"
      @cancel="handleRegenerateCancel"
    />

    <CreateApiKeyDialog
      v-model="showCreateDialog"
      :project-id="selectedProjectId"
      @created="handleKeyCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const apiKeysStore = useApiKeysStore()
const projectsStore = useProjectsStore()

const showRevokeDialog = ref(false)
const showRegenerateDialog = ref(false)
const showCreateDialog = ref(false)
const selectedKey = ref<{ key_id: number, name: string, project_id: number, status: string } | null>(null)
const revokeLoading = ref(false)
const regenerateLoading = ref(false)
const newlyCreatedKey = ref<{ full_key: string } | null>(null)
const showNewKey = ref(false)

const selectedProjectId = computed(() => projectsStore.projects[0]?.project_id ?? 0)

const allApiKeys = computed(() => {
  return [...apiKeysStore.apiKeys].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'active'
        ? -1
        : 1
    }
    if (!a.last_used_at && !b.last_used_at)
      return 0
    if (!a.last_used_at)
      return 1
    if (!b.last_used_at)
      return -1

    return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime()
  })
})

const revokedApiKeys = computed(() => apiKeysStore.apiKeys.filter(k => k.status !== 'active'))

function getProjectName(projectId: number) {
  const project = projectsStore.projects.find(p => p.project_id === projectId)

  return project?.name || 'Unknown'
}

function formatDate(dateString: string) {
  const date = new Date(dateString)

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function handleCreateKey() {
  showCreateDialog.value = true
}

function handleKeyCreated() {}

function handleRevokeClick(apiKey: { key_id: number, name: string, project_id: number, status: string }) {
  selectedKey.value = apiKey
  showRevokeDialog.value = true
}

function handleRevokeCancel() {
  selectedKey.value = null
}

async function handleRevokeConfirm() {
  if (!selectedKey.value)
    return

  revokeLoading.value = true

  try {
    const result = await apiKeysStore.revokeApiKey(selectedKey.value.key_id)

    if (result.success) {
      showRevokeDialog.value = false
      selectedKey.value = null
    }
  }
  catch (error) {
    console.error('Failed to revoke API key:', error)
  }
  finally {
    revokeLoading.value = false
  }
}

function handleRegenerateClick(apiKey: { key_id: number, name: string, project_id: number, status: string }) {
  selectedKey.value = apiKey
  showRegenerateDialog.value = true
}

function handleRegenerateCancel() {
  selectedKey.value = null
}

async function handleRegenerateConfirm() {
  if (!selectedKey.value)
    return

  regenerateLoading.value = true
  newlyCreatedKey.value = null
  showNewKey.value = false

  try {
    const result = await apiKeysStore.regenerateApiKey(
      selectedKey.value.key_id,
      selectedKey.value.project_id,
      selectedKey.value.name,
      selectedKey.value.status,
    )

    if (result.success && result.apiKey) {
      newlyCreatedKey.value = { full_key: result.apiKey.full_key }
      showRegenerateDialog.value = false
      selectedKey.value = null
    }
  }
  catch (error) {
    console.error('Failed to regenerate API key:', error)
  }
  finally {
    regenerateLoading.value = false
  }
}

function dismissNewKey() {
  newlyCreatedKey.value = null
  showNewKey.value = false
}

async function copyNewKey() {
  if (!newlyCreatedKey.value)
    return

  try {
    await navigator.clipboard.writeText(newlyCreatedKey.value.full_key)
  }
  catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}
</script>
