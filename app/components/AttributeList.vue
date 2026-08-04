<template>
  <div v-if="entries.length > 0">
    <div class="d-flex align-center mb-1">
      <span class="text-caption font-weight-bold">{{ title }}</span>

      <span class="text-caption text-medium-emphasis ml-2">{{ entries.length }}</span>

      <v-spacer />

      <v-btn
        :icon="showRaw
          ? 'mdi-format-list-bulleted'
          : 'mdi-code-json'"
        :title="showRaw
          ? 'Show as list'
          : 'Show raw JSON'"
        size="x-small"
        variant="text"
        @click.stop="showRaw = !showRaw"
      />

      <v-btn
        :icon="copied
          ? 'mdi-check'
          : 'mdi-content-copy'"
        :color="copied
          ? 'success'
          : undefined"
        title="Copy JSON"
        size="x-small"
        variant="text"
        @click.stop="copyJson"
      />
    </div>

    <pre
      v-if="showRaw"
      class="attr-raw text-caption"
    >{{ rawJson }}</pre>

    <div v-else>
      <AttributeNode
        v-for="entry in entries"
        :key="entry.name"
        :name="entry.name"
        :value="entry.value"
      />
    </div>

    <v-snackbar
      v-model="showCopyError"
      color="error"
      timeout="3000"
      location="bottom right"
    >
      Could not copy the attributes. Copy them from the raw JSON view instead.
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { toAttributeEntries } from '~/utils/attributes'

const props = withDefaults(defineProps<{
  attributes?: Record<string, unknown> | null
  title?: string
}>(), {
  attributes: null,
  title: 'Attributes',
})

const entries = computed(() => toAttributeEntries(props.attributes))
const rawJson = computed(() => JSON.stringify(props.attributes, null, 2))

const showRaw = ref(false)
const copied = ref(false)
const showCopyError = ref(false)

let resetTimeout: ReturnType<typeof setTimeout> | null = null

async function copyJson() {
  try {
    await navigator.clipboard.writeText(rawJson.value)
    copied.value = true

    if (resetTimeout)
      clearTimeout(resetTimeout)

    resetTimeout = setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  catch {
    showCopyError.value = true
  }
}

onBeforeUnmount(() => {
  if (resetTimeout)
    clearTimeout(resetTimeout)
})
</script>

<style scoped>
.attr-raw {
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
