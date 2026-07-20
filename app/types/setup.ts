export interface SetupStep {
  title: string
  description?: string
  code?: string
  label?: string
  icon?: string
}

export interface SetupGuide {
  key: string
  title: string
  icon: string
  summary: string
  steps: SetupStep[]
}
