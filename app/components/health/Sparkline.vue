<template>
  <VChart
    class="sparkline"
    :option="option"
    :theme="isDark ? 'dark' : undefined"
    autoresize
  />
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  points: number[]
  color?: string
}>(), {
  color: '#42a5f5',
})

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const option = computed(() => ({
  backgroundColor: 'transparent',
  grid: { top: 2, right: 2, bottom: 2, left: 2 },
  xAxis: { type: 'category', show: false },
  yAxis: { type: 'value', show: false },
  series: [{
    type: 'line',
    data: props.points,
    smooth: true,
    symbol: 'none',
    lineStyle: { color: props.color, width: 1.5 },
    areaStyle: { color: props.color, opacity: 0.15 },
  }],
  tooltip: { show: false },
}))
</script>

<style scoped>
.sparkline {
  width: 100%;
  height: 28px;
}
</style>
