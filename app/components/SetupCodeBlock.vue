<template>
  <v-card
    color="surface-variant-dark"
    flat
    class="overflow-hidden rounded-lg"
  >
    <div class="d-flex align-center code-toolbar px-3 py-1">
      <v-icon
        :icon="icon"
        size="small"
        color="primary"
      />

      <span class="text-caption text-medium-emphasis ml-2">
        {{ label }}
      </span>

      <v-spacer />

      <v-btn
        :icon="copied
          ? 'mdi-check'
          : 'mdi-content-copy'"
        :color="copied
          ? 'success'
          : undefined"
        size="x-small"
        variant="text"
        :aria-label="copied
          ? 'Copied'
          : 'Copy to clipboard'"
        @click="copy"
      />
    </div>

    <v-card-text class="pa-4 pt-2">
      <pre class="setup-code"><code>{{ code }}</code></pre>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  code: string
  label?: string
  icon?: string
}>(), {
  label: 'python',
  icon: 'mdi-language-python',
})

const copied = ref(false)
let resetTimeout: ReturnType<typeof setTimeout> | null = null

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true

    if (resetTimeout)
      clearTimeout(resetTimeout)

    resetTimeout = setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

onBeforeUnmount(() => {
  if (resetTimeout)
    clearTimeout(resetTimeout)
})
</script>

<style scoped>
.code-toolbar {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.setup-code {
  margin: 0;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.8125rem;
  line-height: 1.65;
  white-space: pre;
  overflow-x: auto;
  color: rgb(var(--v-theme-on-surface));
}
</style>
