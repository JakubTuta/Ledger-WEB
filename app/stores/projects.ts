import { defineStore } from 'pinia'
import type { CreateProjectRequest, Project, ProjectListResponse } from '~/types/project'

export const useProjectsStore = defineStore('projects', () => {
  const { client } = useApiStore()

  const projects = ref<Project[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)
  const hasData = computed(() => projects.value.length > 0)

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
    fetchProjects,
    refreshProjects,
    createProject,
  }
})
