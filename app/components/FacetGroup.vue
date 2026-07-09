<script setup lang="ts">
import type { ExploreFacetValue } from '~/types/explore'

const props = defineProps<{
  title: string
  values: ExploreFacetValue[]
  isActive: (value: string) => boolean
}>()

const emit = defineEmits<{
  toggle: [value: string]
}>()

const sortedValues = computed(() => [...props.values].sort((a, b) => b.count - a.count),
)
</script>

<template>
  <div
    v-if="values.length"
    class="facet-group mb-4"
  >
    <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">
      {{ title }}
    </div>

    <div class="d-flex flex-column ga-1">
      <v-chip
        v-for="item in sortedValues"
        :key="item.value"
        :variant="isActive(item.value)
          ? 'flat'
          : 'outlined'"
        :color="isActive(item.value)
          ? 'primary'
          : undefined"
        size="small"
        class="justify-space-between facet-chip"
        @click="emit('toggle', item.value)"
      >
        <span class="text-truncate">{{ item.value }}</span>

        <span class="text-medium-emphasis ml-2">{{ item.count }}</span>
      </v-chip>
    </div>
  </div>
</template>

<style scoped>
.facet-chip {
  width: 100%;
  cursor: pointer;
}

.facet-chip :deep(.v-chip__content) {
  width: 100%;
  display: flex;
  justify-content: space-between;
}
</style>
