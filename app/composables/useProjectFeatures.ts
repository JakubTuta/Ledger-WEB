import type { Project } from '~/types/project'

export function useProjectFeatures(project: Ref<Project | null | undefined> | ComputedRef<Project | null | undefined>) {
  const tracing = computed(() => project.value?.features?.tracing ?? false)
  const customMetrics = computed(() => project.value?.features?.custom_metrics ?? false)
  const alertRules = computed(() => project.value?.features?.alert_rules ?? false)

  return { tracing, customMetrics, alertRules }
}
