import type { CreateProjectRequest, Project, ProjectListResponse } from '~/types/project'
import { defineStore } from 'pinia'

const SELECTED_PROJECT_STORAGE_KEY = 'ledger_selected_project'

function loadSelectedProjectFromStorage(): string | null {
  try {
    return localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY)
  }
  catch { return null }
}

function saveSelectedProjectToStorage(projectId: string | null) {
  try {
    if (projectId)
      localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, projectId)
    else
      localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY)
  }
  catch { /* noop */ }
}

export const useProjectsStore = defineStore('projects', () => {
  const { client } = useApiStore()

  const projects = ref<Project[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)
  const hasData = computed(() => projects.value.length > 0)

  // The project picked on one page stays picked on every other page and
  // across reloads.
  const selectedProjectId = ref<string | null>(import.meta.client
    ? loadSelectedProjectFromStorage()
    : null)

  watch(selectedProjectId, saveSelectedProjectToStorage)

  // Falls back to the first project when the remembered one no longer exists
  // (deleted, left, or another account logged in). Before the list has been
  // fetched there is nothing to validate against, so the selection is kept.
  function ensureSelectedProject() {
    if (!lastFetchTime.value)
      return

    const isKnown = projects.value.some(p => String(p.project_id) === selectedProjectId.value)
    if (!isKnown) {
      selectedProjectId.value = projects.value[0]
        ? String(projects.value[0].project_id)
        : null
    }
  }

  const fetchProjects = async (force = false) => {
    if (isLoading.value)
      return

    if (!force && hasData.value)
      return

    isLoading.value = true

    try {
      const response = await client.get<ProjectListResponse>('/api/v1/projects')

      projects.value = response.data.projects
      total.value = response.data.total
      lastFetchTime.value = new Date()
      ensureSelectedProject()
    }
    catch (error) {
      console.error('Error fetching projects:', error)
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  const refreshProjects = async () => {
    await fetchProjects(true)
  }

  const createProject = async (data: CreateProjectRequest) => {
    try {
      const response = await client.post<Project>('/api/v1/projects', data)

      projects.value.push(response.data)
      total.value += 1
      ensureSelectedProject()

      return { success: true, project: response.data }
    }
    catch (error: any) {
      console.error('Error creating project:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to create project'

      return { success: false, error: errorMessage }
    }
  }

  return {
    projects,
    total,
    isLoading,
    lastFetchTime,
    hasData,
    selectedProjectId,
    ensureSelectedProject,
    fetchProjects,
    refreshProjects,
    createProject,
  }
})
