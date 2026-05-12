<template>
  <div class="d-flex align-center">
    <v-tabs
      :model-value="panelsStore.activeTabId"
      color="primary"
      density="compact"
      @update:model-value="handleTabChange"
    >
      <v-tab
        v-for="tab in panelsStore.tabs"
        :key="tab.id"
        :value="tab.id"
        class="tab-item"
      >
        <div class="d-flex align-center gap-1">
          <span>{{ tab.name }}</span>

          <v-menu :close-on-content-click="true">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                icon="mdi-dots-vertical"
                variant="text"
                size="x-small"
                class="tab-menu-btn"
                @click.stop
              />
            </template>

            <v-list density="compact">
              <v-list-item
                prepend-icon="mdi-pencil"
                title="Rename"
                @click="startRename(tab)"
              />
              <v-list-item
                v-if="panelsStore.tabs.length > 1"
                prepend-icon="mdi-delete"
                title="Delete"
                base-color="error"
                @click="confirmDelete(tab)"
              />
            </v-list>
          </v-menu>
        </div>
      </v-tab>
    </v-tabs>

    <v-btn
      icon="mdi-plus"
      variant="text"
      size="small"
      title="Add dashboard"
      class="ml-1"
      @click="templatePickerOpen = true"
    />

    <!-- Rename dialog -->
    <v-dialog
      v-model="renameOpen"
      max-width="320"
    >
      <v-card>
        <v-card-title class="pa-4">
          Rename tab
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="renameName"
            label="Tab name"
            variant="outlined"
            density="compact"
            autofocus
            @keydown.enter="commitRename"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="renameOpen = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            @click="commitRename"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm -->
    <v-dialog
      v-model="deleteOpen"
      max-width="320"
    >
      <v-card>
        <v-card-title class="pa-4">
          Delete "{{ deletingTab?.name }}"?
        </v-card-title>
        <v-card-text>
          Panels in this tab will not be deleted from the server.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="deleteOpen = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            @click="commitDelete"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Template picker -->
    <DashboardsTemplatePicker
      v-if="projectId"
      v-model="templatePickerOpen"
      :project-id="projectId"
      @applied="emit('templateApplied')"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId?: string | number
}>()

const emit = defineEmits<{
  templateApplied: []
}>()

const panelsStore = usePanelsStore()

const templatePickerOpen = ref(false)
const renameOpen = ref(false)
const renameName = ref('')
const renameTabId = ref<string | null>(null)
const deleteOpen = ref(false)
const deletingTab = ref<{ id: string; name: string } | null>(null)

function handleTabChange(tabId: string) {
  panelsStore.setActiveTab(tabId)
}

function startRename(tab: { id: string; name: string }) {
  renameTabId.value = tab.id
  renameName.value = tab.name
  renameOpen.value = true
}

function commitRename() {
  if (renameTabId.value && renameName.value.trim()) {
    panelsStore.renameTab(renameTabId.value, renameName.value.trim())
  }
  renameOpen.value = false
}

function confirmDelete(tab: { id: string; name: string }) {
  deletingTab.value = tab
  deleteOpen.value = true
}

function commitDelete() {
  if (deletingTab.value) {
    panelsStore.deleteTab(deletingTab.value.id)
  }
  deleteOpen.value = false
}
</script>

<style scoped>
.tab-menu-btn {
  opacity: 0;
  transition: opacity 0.15s;
}

.tab-item:hover .tab-menu-btn,
.tab-item.v-tab--selected .tab-menu-btn {
  opacity: 1;
}
</style>
