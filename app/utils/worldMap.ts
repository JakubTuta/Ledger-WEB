import type { Topology } from 'topojson-specification'

// Registers the 'world' map once for echarts' MapChart, lazily - the
// topology (~90KB) and its converter only load when a country-map panel is
// actually rendered, not in the main bundle. Concurrent callers (e.g. two
// country-map panels mounting at once) share the same in-flight promise so
// the topology is fetched and registered exactly once.
let registerPromise: Promise<void> | null = null

export function ensureWorldMapRegistered(): Promise<void> {
  if (!registerPromise) {
    registerPromise = registerWorldMap()
  }

  return registerPromise
}

type Point = [number, number]

// Where a dateline-crossing edge leaves the map, and at what latitude.
// `wrapped` is the true (short-way-around) longitude delta: an edge listed
// as 178.6 -> -180.0 is really 1.4deg eastward, not 358.6deg westward.
// When it is exactly 0 the two points are the same place written with
// opposite signs (+180 vs -180), so there is no direction to infer and the
// edge has to exit on the side it is already on.
function antimeridianCrossing(a: Point, b: Point): { exitLon: number, lat: number } {
  const dlon = b[0] - a[0]
  const wrapped = dlon > 0
    ? dlon - 360
    : dlon + 360
  const exitLon = wrapped > 0
    ? 180
    : wrapped < 0
      ? -180
      : (a[0] >= 0
          ? 180
          : -180)
  const t = wrapped === 0
    ? 0
    : (exitLon - a[0]) / wrapped

  return { exitLon, lat: a[1] + t * (b[1] - a[1]) }
}

function closeRing(points: Point[]): Point[] {
  const first = points[0]!
  const last = points[points.length - 1]!
  if (first[0] !== last[0] || first[1] !== last[1])
    points.push([first[0], first[1]])

  return points
}

// Natural Earth stores countries that straddle the 180th meridian (Russia,
// Fiji) as single rings whose longitudes wrap straight past the edge of the
// map. echarts renders geographic coordinates directly, with no projection
// that understands wrapping, so it draws each wrapping edge as a horizontal
// line spanning the entire chart. Splitting those rings at the meridian into
// separate east/west polygons is the standard fix and, unlike dropping the
// offending rings, keeps the land they describe (Russia's Chukotka tip,
// Fiji's eastern islands).
function splitRingAtAntimeridian(ring: Point[]): Point[][] {
  const points = ring.slice()
  while (points.length > 1
    && points[0]![0] === points[points.length - 1]![0]
    && points[0]![1] === points[points.length - 1]![1]) {
    points.pop()
  }

  const count = points.length
  if (count < 2)
    return [ring]

  const crosses = (from: Point, to: Point) => Math.abs(to[0] - from[0]) > 180

  let firstCrossing = -1
  for (let i = 0; i < count; i++) {
    if (crosses(points[i]!, points[(i + 1) % count]!)) {
      firstCrossing = i
      break
    }
  }
  if (firstCrossing === -1)
    return [closeRing(points)]

  // Walk the ring cyclically starting just after a crossing, so every piece
  // begins and ends on the meridian and no piece straddles the seam.
  const segments: Point[][] = []
  const entry = antimeridianCrossing(points[firstCrossing]!, points[(firstCrossing + 1) % count]!)
  let current: Point[] = [[-entry.exitLon, entry.lat]]

  for (let step = 1; step <= count; step++) {
    const index = (firstCrossing + step) % count
    const point = points[index]!
    current.push(point)

    const next = points[(index + 1) % count]!
    if (crosses(point, next)) {
      const exit = antimeridianCrossing(point, next)
      current.push([exit.exitLon, exit.lat])
      if (current.length >= 4)
        segments.push(closeRing(current))
      current = [[-exit.exitLon, exit.lat]]
    }
  }
  if (current.length >= 4)
    segments.push(closeRing(current))

  return segments
}

function splitGeometryAtAntimeridian(geometry: any): any {
  const rings: Point[][] | null = geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat(1)
      : null

  if (!rings)
    return geometry

  const polygons: Point[][][] = []
  for (const ring of rings) {
    for (const piece of splitRingAtAntimeridian(ring))
      polygons.push([piece])
  }

  return { type: 'MultiPolygon', coordinates: polygons }
}

// ISO 3166-1 numeric for Antarctica. Real geography, not an artifact - it
// legitimately wraps the whole south pole - but it is never a meaningful
// request origin, and unprojected it renders as a bar across the bottom of
// the chart, so it is left out entirely.
const ANTARCTICA_NUMERIC_ID = '010'

function numericIdOf(feature: any): string {
  return typeof feature.id === 'number'
    ? String(feature.id).padStart(3, '0')
    : String(feature.id ?? '')
}

async function registerWorldMap(): Promise<void> {
  const [echarts, topojsonClient, topologyModule] = await Promise.all([
    import('echarts/core'),
    import('topojson-client'),
    import('world-atlas/countries-110m.json'),
  ])

  // world-atlas's published JSON doesn't precisely match the
  // topojson-specification types (e.g. `transform.scale` as `number[]`
  // rather than a 2-tuple) - this is a data-shape trust boundary against a
  // well-known, stable third-party dataset, not a logic concern.
  const topology = (topologyModule.default ?? topologyModule) as unknown as Topology
  const collection: { features: any[] } = topojsonClient.feature(
    topology,
    topology.objects.countries as any,
  ) as any

  const features = collection.features
    .filter((f: any) => numericIdOf(f) !== ANTARCTICA_NUMERIC_ID)
    .map((f: any) => ({
      ...f,
      geometry: splitGeometryAtAntimeridian(f.geometry),
      properties: {
        name: f.properties?.name ?? '',
        // Disputed territories (Kosovo, Somaliland, N. Cyprus) carry no id
        // in this dataset, so they never match a country in the series data
        // and fall back to the series' default area colour - which is why
        // that colour is kept identical to the zero-request colour.
        iso_a2: alpha2FromNumericId(numericIdOf(f)) ?? null,
      },
    }))

  echarts.registerMap('world', { type: 'FeatureCollection', features } as any)
}
