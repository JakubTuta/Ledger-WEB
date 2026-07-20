<template>
  <v-timeline
    side="end"
    align="start"
    density="comfortable"
    truncate-line="both"
  >
    <v-timeline-item
      v-for="(step, index) in steps"
      :key="step.title"
      dot-color="primary"
      size="small"
      fill-dot
    >
      <template #icon>
        <span class="text-caption font-weight-bold">{{ index + 1 }}</span>
      </template>

      <div class="mb-2">
        <h3 class="text-h6 font-weight-bold mb-1">
          {{ step.title }}
        </h3>

        <p
          v-if="step.description"
          class="text-body-2 text-medium-emphasis mb-3"
        >
          {{ step.description }}
        </p>

        <SetupCodeBlock
          v-if="step.code"
          :code="step.code"
          :label="step.label ?? 'python'"
          :icon="step.icon ?? 'mdi-language-python'"
        />
      </div>
    </v-timeline-item>
  </v-timeline>
</template>

<script setup lang="ts">
import type { SetupStep } from '~/types/setup'

defineProps<{
  steps: SetupStep[]
}>()
</script>
