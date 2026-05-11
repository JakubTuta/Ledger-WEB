<template>
  <v-dialog
    v-model="isOpen"
    max-width="380"
    :fullscreen="$vuetify.display.smAndDown"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Keyboard Shortcuts</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="isOpen = false"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-list density="compact">
          <v-list-item
            v-for="shortcut in shortcuts"
            :key="shortcut.key"
          >
            <template #prepend>
              <v-chip
                size="x-small"
                variant="outlined"
                class="font-weight-bold monospace mr-3"
                style="min-width: 28px; justify-content: center;"
              >
                {{ shortcut.key }}
              </v-chip>
            </template>
            <v-list-item-title class="text-body-2">
              {{ shortcut.label }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const isOpen = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const shortcuts = [
  { key: 'n', label: 'Add new panel' },
  { key: 'r', label: 'Refresh all panels' },
  { key: 'e', label: 'Toggle edit / drag mode' },
  { key: '?', label: 'Show this help dialog' },
]
</script>

<style scoped>
.monospace {
  font-family: monospace;
}
</style>
