<template>
  <div class="overflow-x-auto">
    <div :style="{'minWidth': `${minWidth}px`}">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  minWidth?: number
}>(), {
  minWidth: 640,
})
</script>
