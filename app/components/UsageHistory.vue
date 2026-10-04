<template>
  <v-card
    variant="elevated"
    class="mt-2"
  >
    <v-card-text>
      <div class="text-subtitle-2 mb-2">
        30-Day Usage History
      </div>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
      >
        {{ error }}

        <template #append>
          <v-btn
            size="small"
            variant="text"
            :loading="isLoading"
            @click="quotaStore.refreshUsageStatsForProject(projectId)"
          >
            Retry
          </v-btn>
        </template>
      </v-alert>

      <v-skeleton-loader
        v-else-if="isLoading && !hasLoaded"
        type="image"
        height="280"
      />

      <v-sheet
        v-else-if="usage.length === 0"
        height="280"
        class="d-flex flex-column align-center text-medium-emphasis justify-center text-center"
      >
        <v-icon
          icon="mdi-chart-box-outline"
          size="40"
          class="mb-2"
        />

        <div class="text-body-2">
          No usage recorded in the last 30 days
        </div>

        <div class="text-caption">
          Daily totals appear once this project has received data, and refresh every 10 minutes.
        </div>
      </v-sheet>

      <UsageHistoryChart
        v-else
        :usage="usage"
        :height="280"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: number
}>()

const quotaStore = useQuotaStore()

const usage = computed(() => quotaStore.getUsageStatsForProject(props.projectId).value)
const error = computed(() => quotaStore.getUsageStatsErrorForProject(props.projectId).value)
const isLoading = computed(() => quotaStore.isLoadingUsageStatsForProject(props.projectId).value)
const hasLoaded = computed(() => quotaStore.hasUsageStatsForProject(props.projectId).value)
</script>
