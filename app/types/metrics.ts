export type MetricKind = 'sum' | 'gauge' | 'histogram'

/**
 * Whether a stored point is a per-interval delta or a running total. A
 * cumulative series is differenced server-side before it reaches the chart;
 * the value is carried here so the panel can say which it is.
 */
export type MetricTemporality = 'unspecified' | 'delta' | 'cumulative'

export type MetricAggregation = 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99'

export type MetricInterval = '1m' | '5m' | '1h' | '1d'

export const METRIC_AGGREGATIONS: MetricAggregation[] = ['avg', 'sum', 'min', 'max', 'count', 'p50', 'p95', 'p99']

export const METRIC_INTERVALS: MetricInterval[] = ['1m', '5m', '1h', '1d']

export interface MetricName {
  name: string
  type: MetricKind
  temporality: MetricTemporality
  tag_keys: string[]
  last_seen: string | null
  series_count: number
}

export interface MetricNamesResponse {
  project_id: number
  metrics: MetricName[]
}

export interface MetricTagKey {
  key: string
  values: string[]
  truncated: boolean
}

export interface MetricTagsResponse {
  project_id: number
  name: string
  keys: MetricTagKey[]
}

export interface MetricSeriesPoint {
  bucket: string
  value: number
}

export interface MetricSeries {
  tags: Record<string, string>
  points: MetricSeriesPoint[]
}

export interface HistogramBucket {
  /** null is the OTLP +Inf overflow bucket, which has no upper edge. */
  upper_bound: number | null
  count: number
}

export interface MetricHistogram {
  tags: Record<string, string>
  buckets: HistogramBucket[]
  count: number
  sum: number
}

export interface MetricSeriesResponse {
  project_id: number
  name: string
  type: MetricKind
  temporality: MetricTemporality
  aggregation: MetricAggregation
  interval: MetricInterval
  series: MetricSeries[]
  histograms: MetricHistogram[]
  /** Served from the hourly rollup rather than raw points. */
  downsampled: boolean
  /** Histogram row cap hit - the series cover only part of the window. */
  truncated: boolean
}

export interface MetricSeriesQuery {
  project_id: string | number
  name: string
  aggregation?: MetricAggregation
  group_by?: string[]
  tag_filters?: Record<string, string>
  interval?: MetricInterval | null
  from?: string
  to?: string
}

export function metricKindLabel(kind: MetricKind): string {
  if (kind === 'sum')
    return 'Counter'
  if (kind === 'histogram')
    return 'Histogram'

  return 'Gauge'
}

/**
 * Aggregations the backend cannot answer for a given metric kind. A counter is
 * a count of events, so a percentile over the raw per-interval values is
 * meaningless; percentiles on a histogram come from its buckets instead.
 */
export function aggregationsFor(kind: MetricKind): MetricAggregation[] {
  if (kind === 'sum')
    return ['sum', 'avg', 'min', 'max', 'count']

  return METRIC_AGGREGATIONS
}
