<template>
  <div class="d-flex flex-column h-100">
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
      v-if="displayedApiKeys.length > 0"
      lines="three"
    >
      <v-list-item
        v-for="apiKey in displayedApiKeys"
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
          <v-btn
            icon="mdi-delete"
            variant="text"
            color="error"
            :disabled="revokeLoading"
            @click="handleRevokeClick(apiKey)"
          />
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
      :message="`Are you sure you want to revoke the API key '${selectedKey?.name}'? This action cannot be undone and the key will immediately stop working.`"
      confirm-text="Revoke"
      cancel-text="Cancel"
      :loading="revokeLoading"
      @confirm="handleRevokeConfirm"
      @cancel="handleRevokeCancel"
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
const showCreateDialog = ref(false)
const selectedKey = ref<{ key_id: number, name: string } | null>(null)
const revokeLoading = ref(false)
const selectedProjectId = computed(() => (projectsStore.projects.length > 0
  ? projectsStore.projects[0].project_id
  : 0))

const displayedApiKeys = computed(() => {
  return apiKeysStore.apiKeys
    .filter(key => key.status === 'active')
    .sort((a, b) => {
      if (!a.last_used_at && !b.last_used_at)
        return 0
      if (!a.last_used_at)
        return 1
      if (!b.last_used_at)
        return -1

      return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime()
    })
})

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

function handleKeyCreated() {
  // Dialog will close automatically
}

function handleRevokeClick(apiKey: { key_id: number, name: string }) {
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
</script>
