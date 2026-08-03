<template>
  <v-menu
    v-model="menuOpen"
    :close-on-content-click="false"
  >
    <template #activator="{'props': menuProps}">
      <v-badge
        :model-value="isNarrowed"
        color="primary"
        dot
        offset-x="4"
        offset-y="4"
      >
        <v-btn
          v-bind="menuProps"
          icon="mdi-filter-variant"
          variant="text"
          size="small"
          title="Filter traffic shown in logs, errors, and country map"
        />
      </v-badge>
    </template>

    <v-card min-width="260">
      <v-card-text class="pb-2">
        <TrafficCategoryOptions />
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
const panelsStore = usePanelsStore()

const menuOpen = ref(false)

const isNarrowed = computed(() => panelsStore.isTrafficFilterActive)
</script>
