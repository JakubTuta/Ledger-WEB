<template>
  <div
    v-if="!ready"
    class="d-flex align-center justify-center"
    style="height: 100%;"
  >
    <v-progress-circular
      indeterminate
      color="primary"
      size="24"
    />
  </div>

  <EChart
    v-else
    class="world-map-chart"
    :option="chartOption"
    :theme="isDark
      ? 'dark'
      : undefined"
    autoresize
  />
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'

const props = defineProps<{
  // alpha-2 country code -> request count. The backend never returns
  // zero-count rows, so a country absent here is treated as zero requests,
  // same as one explicitly counted at zero - the map always covers every
  // country rather than distinguishing "no data" from "0".
  countryCounts: Record<string, number>
}>()

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const ready = ref(false)
onMounted(async () => {
  await ensureWorldMapRegistered()
  ready.value = true
})

interface MapDatum { name: string, value: number }

const mapData = computed<MapDatum[]>(() => Object.keys(ALPHA2_TO_NAME)
  .map(alpha2 => ({ name: alpha2, value: props.countryCounts[alpha2] ?? 0 })))

const maxValue = computed(() => Math.max(1, ...mapData.value.map(d => d.value)))

const lowColor = computed(() => (isDark.value
  ? '#1e3a5f'
  : '#dbeafe'))
const highColor = computed(() => vuetifyTheme.current.value.colors.primary ?? '#1976d2')

function tooltipFormatter(params: any): string {
  const alpha2 = params.name as string
  const count = props.countryCounts[alpha2] ?? 0

  return `<b>${countryName(alpha2)}</b><br/>${count.toLocaleString()} requests`
}

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    formatter: tooltipFormatter,
  },
  visualMap: {
    min: 0,
    max: maxValue.value,
    left: 8,
    bottom: 8,
    orient: 'horizontal',
    calculable: false,
    itemWidth: 10,
    itemHeight: 60,
    textStyle: { fontSize: 10 },
    inRange: { color: [lowColor.value, highColor.value] },
  },
  series: [{
    type: 'map',
    map: 'world',
    nameProperty: 'iso_a2',
    roam: true,
    center: [10, 15],
    zoom: 1.15,
    scaleLimit: { min: 1, max: 8 },
    itemStyle: {
      // Same fill the visualMap gives a zero-request country, so regions
      // with no entry in the series data at all (disputed territories carry
      // no country code in the source topology) are indistinguishable from
      // countries that simply had no requests.
      areaColor: lowColor.value,
      borderColor: isDark.value
        ? '#18181b'
        : '#ffffff',
      borderWidth: 0.5,
    },
    emphasis: {
      label: { show: false },
      itemStyle: { areaColor: undefined },
    },
    select: { disabled: true },
    data: mapData.value,
  }],
}))
</script>

<style scoped>
.world-map-chart {
  width: 100%;
  height: 100%;
}
</style>
