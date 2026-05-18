export type AlertComparator = '>' | '<' | '>=' | '<='
export type ConnectorKind = 'in_app' | 'email' | 'webhook'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertUnit = 'ms' | 's' | '%' | 'count'

export const SEVERITY_LABELS: Record<number, AlertSeverity> = { 0: 'info', 1: 'warning', 2: 'critical' }
export const SEVERITY_VALUES: Record<AlertSeverity, number> = { info: 0, warning: 1, critical: 2 }

export interface MetricDef {
  key: string
  label: string
  units: AlertUnit[]
}

export const METRIC_CATALOG: MetricDef[] = [
  { key: 'p95_latency', label: 'p95 latency', units: ['ms', 's'] },
  { key: 'p99_latency', label: 'p99 latency', units: ['ms', 's'] },
  { key: 'error_rate_5xx', label: '5xx error rate', units: ['%'] },
  { key: 'error_rate_4xx', label: '4xx error rate', units: ['%'] },
  { key: 'error_rate_all', label: 'Error rate (all)', units: ['%'] },
  { key: 'request_volume', label: 'Request volume', units: ['count'] },
]

export const COMPARATOR_OPTIONS: AlertComparator[] = ['>', '<', '>=', '<=']

export interface ConnectorMeta {
  label: string
  icon: string
  color: string
}

export const CONNECTOR_META: Record<ConnectorKind, ConnectorMeta> = {
  webhook: { label: 'Webhook', icon: 'mdi-webhook', color: 'deep-purple' },
  email: { label: 'Email', icon: 'mdi-email', color: 'blue' },
  in_app: { label: 'In-app', icon: 'mdi-bell', color: 'amber-darken-2' },
}

export function connectorMeta(kind: ConnectorKind): ConnectorMeta {
  return CONNECTOR_META[kind] ?? { label: kind, icon: 'mdi-send', color: 'grey' }
}

export function metricLabel(key: string): string {
  return METRIC_CATALOG.find(m => m.key === key)?.label ?? key
}

export interface Connector {
  id: number
  account_id: number
  kind: ConnectorKind
  name: string
  config: string
  enabled: boolean
  created_at: string
}

export interface CreateConnectorRequest {
  kind: ConnectorKind
  name: string
  config?: string
}

export interface UpdateConnectorRequest {
  name?: string | null
  enabled?: boolean | null
  config?: string | null
}

export interface AlertRule {
  id: number
  project_id: number
  name: string
  enabled: boolean
  metric: string
  comparator: AlertComparator
  threshold: number
  unit: AlertUnit
  severity: number
  connector_ids: number[]
  last_fired_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateAlertRuleRequest {
  project_id: number
  name: string
  metric: string
  comparator: AlertComparator
  threshold: number
  unit: AlertUnit
  severity: number
  connector_ids: number[]
}

export interface UpdateAlertRuleRequest {
  name?: string | null
  enabled?: boolean | null
  threshold?: number | null
  unit?: AlertUnit | null
  severity?: number | null
  comparator?: AlertComparator | null
  metric?: string | null
  connector_ids?: number[] | null
}

export interface AlertEventConnector {
  id: number
  kind: ConnectorKind
  name: string
}

export interface AlertEvent {
  id: number
  rule_id: number | null
  project_id: number
  rule_name: string
  metric: string
  comparator: AlertComparator
  threshold: number
  unit: AlertUnit
  value: number
  severity: number
  connectors_sent: string
  fired_at: string
}

export interface AlertEventListResponse {
  events: AlertEvent[]
  has_more: boolean
}
