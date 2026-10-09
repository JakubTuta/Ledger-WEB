export interface ServiceNode {
  service: string
  /** Requests entering the service (server/consumer spans and trace roots). */
  calls: number
  errors: number
  p95_ms: number
}

export interface ServiceEdge {
  caller: string
  callee: string
  calls: number
  errors: number
  p95_ms: number
}

export interface ServiceMapResponse {
  nodes: ServiceNode[]
  edges: ServiceEdge[]
  from_time: string
  to_time: string
  /** Hourly rollup: p95 is the highest hourly p95 in the window. */
  downsampled: boolean
}

export interface RedPoint {
  bucket: string
  calls: number
  errors: number
  p50_ms: number
  p95_ms: number
  p99_ms: number
}

export interface RedSeries {
  service: string
  /** null for a service-level series. */
  operation: string | null
  calls: number
  errors: number
  p95_ms: number
  points: RedPoint[]
}

export interface ServiceRedResponse {
  interval: string
  series: RedSeries[]
  from_time: string
  to_time: string
}

/** Which RED signal a chart shows. */
export type RedMetric = 'rate' | 'errors' | 'duration'

/** The widest window the span aggregations accept. */
export const MAX_SERVICE_WINDOW_DAYS = 7
