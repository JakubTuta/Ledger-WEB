<template>
  <div>
    <div
      class="attr-row d-flex align-start"
      :class="{'cursor-pointer': isBranch}"
      @click="toggle"
    >
      <v-icon
        v-if="isBranch"
        :icon="expanded
          ? 'mdi-menu-down'
          : 'mdi-menu-right'"
        size="14"
        class="attr-caret text-medium-emphasis flex-shrink-0"
      />

      <span
        v-else
        class="attr-caret flex-shrink-0"
      />

      <span class="attr-key text-caption flex-shrink-0">{{ name }}</span>

      <span
        v-if="isBranch"
        class="text-caption text-medium-emphasis"
      >{{ branchSummary }}</span>

      <span
        v-else
        class="attr-value text-caption"
        :class="attributeValueClass(value)"
      >{{ formatAttributeValue(value) }}</span>
    </div>

    <div
      v-if="isBranch && expanded"
      class="attr-children"
    >
      <AttributeNode
        v-for="child in children"
        :key="child.name"
        :name="child.name"
        :value="child.value"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { attributeValueClass, formatAttributeValue, toAttributeEntries } from '~/utils/attributes'

const props = withDefaults(defineProps<{
  name: string
  value: unknown
  depth?: number
}>(), {
  depth: 0,
})

defineOptions({ name: 'AttributeNode' })

const children = computed(() => toAttributeEntries(props.value))
const isBranch = computed(() => children.value.length > 0)

const branchSummary = computed(() => (Array.isArray(props.value)
  ? `[${children.value.length}]`
  : `{${children.value.length}}`),
)

// Only the top level opens by default; deeper groups stay folded until clicked.
const expandedOverride = ref<boolean | null>(null)
const expanded = computed(() => expandedOverride.value ?? props.depth === 0)

function toggle() {
  if (isBranch.value)
    expandedOverride.value = !expanded.value
}
</script>

<style scoped>
/* A key too long to share its line pushes the value onto the next line at full
   width, instead of the key breaking mid-token inside a narrow column. */
.attr-row {
  gap: 2px 6px;
  padding: 2px 0;
  line-height: 1.45;
  border-radius: 3px;
  flex-wrap: wrap;
}

.attr-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.attr-caret {
  width: 14px;
}

.attr-key {
  font-family: 'Courier New', monospace;
  color: rgba(var(--v-theme-on-surface), 0.75);
  flex: 0 0 auto;
  min-width: 96px;
  max-width: calc(100% - 20px);
  overflow-wrap: anywhere;
}

.attr-key::after {
  content: ':';
  opacity: 0.4;
}

.attr-value {
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1 1 120px;
  max-height: 160px;
  overflow-y: auto;
}

.attr-children {
  margin-left: 6px;
  padding-left: 8px;
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
