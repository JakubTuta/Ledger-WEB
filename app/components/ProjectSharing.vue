<template>
  <v-card variant="elevated">
    <v-card-title class="d-flex align-center flex-wrap gap-2">
      <span>{{ project.name }}</span>

      <v-chip
        size="small"
        :color="project.environment === 'production'
          ? 'error'
          : 'primary'"
        class="ml-2"
      >
        {{ project.environment }}
      </v-chip>

      <v-spacer />

      <v-btn
        v-if="isOwner"
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-link-plus"
        @click="showInviteDialog = true"
      >
        Generate invite
      </v-btn>

      <v-btn
        v-else
        color="error"
        variant="flat"
        size="small"
        prepend-icon="mdi-exit-to-app"
        @click="showLeaveDialog = true"
      >
        Leave project
      </v-btn>
    </v-card-title>

    <v-card-text>
      <div
        v-if="isLoading"
        class="d-flex justify-center py-4"
      >
        <v-progress-circular
          indeterminate
          color="primary"
          size="small"
        />
      </div>

      <v-list
        v-else-if="members.length > 0"
        lines="two"
      >
        <v-list-item
          v-for="member in members"
          :key="member.account_id"
          class="mb-1"
        >
          <v-list-item-title class="d-flex align-center gap-2">
            {{ member.name || member.email }}

            <v-chip
              size="x-small"
              :color="member.role === 'owner'
                ? 'primary'
                : 'default'"
            >
              {{ member.role }}
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle>
            {{ member.email }} · Joined {{ formatDate(member.joined_at) }}
          </v-list-item-subtitle>

          <template #append>
            <v-btn
              v-if="isOwner && member.account_id !== currentUserId"
              icon="mdi-delete"
              variant="text"
              color="error"
              size="small"
              :disabled="removeLoading"
              @click="handleRemoveClick(member)"
            />
          </template>
        </v-list-item>
      </v-list>

      <v-alert
        v-else
        type="info"
        variant="flat"
        density="compact"
      >
        No members found. Generate an invite code to add members.
      </v-alert>

      <v-alert
        v-if="actionError"
        type="error"
        density="compact"
        class="mt-3"
        closable
        @click:close="actionError = ''"
      >
        {{ actionError }}
      </v-alert>
    </v-card-text>

    <GenerateInviteDialog
      v-model="showInviteDialog"
      :project-id="project.project_id"
      :project-name="project.name"
    />

    <ConfirmDialog
      v-model="showRemoveDialog"
      title="Remove Member"
      :message="`Remove ${selectedMember?.name || selectedMember?.email} from ${project.name}? They will lose access immediately.`"
      confirm-text="Remove"
      cancel-text="Cancel"
      :loading="removeLoading"
      @confirm="handleRemoveConfirm"
      @cancel="selectedMember = null"
    />

    <ConfirmDialog
      v-model="showLeaveDialog"
      title="Leave Project"
      :message="`Leave ${project.name}? You will lose access until re-invited.`"
      confirm-text="Leave"
      cancel-text="Cancel"
      :loading="leaveLoading"
      @confirm="handleLeaveConfirm"
    />
  </v-card>
</template>

<script setup lang="ts">
import type { Project } from '~/types/project'
import type { ProjectMember } from '~/types/sharing'

const props = defineProps<{
  project: Project
}>()

const sharingStore = useSharingStore()
const authStore = useAuthStore()

const showInviteDialog = ref(false)
const showRemoveDialog = ref(false)
const showLeaveDialog = ref(false)
const selectedMember = ref<ProjectMember | null>(null)
const removeLoading = ref(false)
const leaveLoading = ref(false)
const actionError = ref('')

const members = sharingStore.getMembersForProject(props.project.project_id)
const isLoading = sharingStore.isLoadingForProject(props.project.project_id)

const currentUserId = computed(() => authStore.user?.account_id)

const isOwner = computed(() => members.value.some(m => m.account_id === currentUserId.value && m.role === 'owner'),
)

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function handleRemoveClick(member: ProjectMember) {
  selectedMember.value = member
  showRemoveDialog.value = true
}

async function handleRemoveConfirm() {
  if (!selectedMember.value)
    return

  removeLoading.value = true
  actionError.value = ''

  const result = await sharingStore.removeMember(props.project.project_id, selectedMember.value.account_id)

  if (result.success) {
    showRemoveDialog.value = false
    selectedMember.value = null
  }
  else {
    actionError.value = result.error || 'Failed to remove member'
  }

  removeLoading.value = false
}

async function handleLeaveConfirm() {
  leaveLoading.value = true
  actionError.value = ''

  const result = await sharingStore.leaveProject(props.project.project_id)

  if (!result.success) {
    actionError.value = result.error || 'Failed to leave project'
    showLeaveDialog.value = false
  }

  leaveLoading.value = false
}

onMounted(() => {
  sharingStore.fetchMembers(props.project.project_id)
})
</script>
