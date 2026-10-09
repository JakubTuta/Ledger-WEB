/**
 * The project shared by every project-scoped page. A `?project=` deep link
 * wins over the remembered selection, and the URL is kept in sync so the
 * current view stays linkable.
 */
export function useSelectedProject() {
  const projectsStore = useProjectsStore()
  const { selectedProjectId } = storeToRefs(projectsStore)
  const route = useRoute()
  const router = useRouter()

  if (typeof route.query.project === 'string')
    selectedProjectId.value = route.query.project

  projectsStore.ensureSelectedProject()

  function syncProjectQuery() {
    if (route.query.project === (selectedProjectId.value ?? undefined))
      return

    router.replace({ query: { ...route.query, project: selectedProjectId.value ?? undefined } })
  }

  watch(selectedProjectId, syncProjectQuery)
  onMounted(syncProjectQuery)

  return selectedProjectId
}
