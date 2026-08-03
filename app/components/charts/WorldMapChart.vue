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
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import type { ContinentCode } from '~/utils/continents'
import { useTheme } from 'vuetify'

const props = defineProps<{
  // alpha-2 country code -> request count. The backend never returns
  // zero-count rows, so a country absent here is treated as zero requests,
  // same as one explicitly counted at zero - the map always covers every
  // country/continent rather than distinguishing "no data" from "0".
  countryCounts: Record<string, number>
  focusedContinent: ContinentCode | null
}>()

const emit = defineEmits<{
  countryClick: [alpha2: string]
}>()

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const ready = ref(false)
onMounted(async () => {
  await ensureWorldMapRegistered()
  ready.value = true
})

const continentTotals = computed(() => {
  const totals: Partial<Record<ContinentCode, number>> = {}
  for (const [alpha2, count] of Object.entries(props.countryCounts)) {
    const continent = continentForCountry(alpha2)
    if (!continent)
      continue
    totals[continent] = (totals[continent] ?? 0) + count
  }

  return totals
})

const worldTotal = computed(() => Object.values(props.countryCounts).reduce((s, v) => s + v, 0))

interface MapDatum { name: string, value: number }

const mapData = computed<MapDatum[]>(() => {
  const entries = Object.entries(ALPHA2_TO_CONTINENT) as [string, ContinentCode][]

  if (props.focusedContinent) {
    return entries
      .filter(([, continent]) => continent === props.focusedContinent)
      .map(([alpha2]) => ({ name: alpha2, value: props.countryCounts[alpha2] ?? 0 }))
  }

  return entries.map(([alpha2, continent]) => ({ name: alpha2, value: continentTotals.value[continent] ?? 0 }))
})

const maxValue = computed(() => Math.max(1, ...mapData.value.map(d => d.value)))

const viewport = computed(() => (props.focusedContinent
  ? CONTINENT_VIEWPORTS[props.focusedContinent]
  : { center: [10, 15] as [number, number], zoom: 1.15 }),
)

const lowColor = computed(() => (isDark.value
  ? '#1e3a5f'
  : '#dbeafe'))
const highColor = computed(() => vuetifyTheme.current.value.colors.primary ?? '#1976d2')

function tooltipFormatter(params: any): string {
  const alpha2 = params.name as string
  if (props.focusedContinent) {
    const count = props.countryCounts[alpha2] ?? 0

    return `<b>${countryName(alpha2)}</b><br/>${count.toLocaleString()} requests`
  }

  const continent = continentForCountry(alpha2)
  if (!continent)
    return countryName(alpha2)
  const total = continentTotals.value[continent] ?? 0
  const share = worldTotal.value > 0
    ? ((total / worldTotal.value) * 100).toFixed(1)
    : '0'

  return `<b>${CONTINENT_NAMES[continent]}</b><br/>${total.toLocaleString()} requests (${share}% of total)`
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
    center: viewport.value.center,
    zoom: viewport.value.zoom,
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

function handleClick(params: any) {
  if (params.componentType !== 'series')
    return
  const alpha2 = params.name as string
  if (alpha2)
    emit('countryClick', alpha2)
}
</script>

<style scoped>
.world-map-chart {
  width: 100%;
  height: 100%;
}
</style>
