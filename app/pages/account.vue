<template>
  <v-container
    fluid
    class="pa-4"
    style="height: calc(100vh - 64px);"
  >
    <v-card
      class="w-100"
      style="height: 100%;"
    >
      <v-row
        class="ma-0"
        no-gutters
        style="height: 100%;"
      >
        <!-- Left Column: Navigation -->
        <v-col
          cols="12"
          md="3"
          class="border-e"
        >
          <v-list class="pa-4">
            <v-list-subheader>Settings</v-list-subheader>

            <v-list-item
              :active="activeSection === 'projects'"
              title="Projects"
              prepend-icon="mdi-folder-multiple"
              @click="scrollToSection('projects')"
            />

            <v-list-item
              :active="activeSection === 'notifications'"
              title="Notifications"
              prepend-icon="mdi-bell"
              @click="scrollToSection('notifications')"
            />

            <v-list-item
              :active="activeSection === 'quota'"
              title="Quota usage"
              prepend-icon="mdi-chart-line"
              @click="scrollToSection('quota')"
            />

            <v-list-item
              :active="activeSection === 'apiKeys'"
              title="API keys"
              prepend-icon="mdi-key"
              @click="scrollToSection('apiKeys')"
            />

            <v-list-item
              :active="activeSection === 'account'"
              title="Account settings"
              prepend-icon="mdi-account"
              @click="scrollToSection('account')"
            />
          </v-list>
        </v-col>

        <!-- Right Column: Scrollable Content -->
        <v-col
          cols="12"
          md="9"
          class="pa-0"
          style="height: 100%;"
        >
          <div
            ref="scrollContainer"
            class="overflow-y-auto pa-6"
            style="height: 100%;"
            @scroll="handleScroll"
          >
            <!-- Projects Section -->
            <div
              ref="projectsSection"
              style="min-height: calc(100vh - 120px);"
            >
              <v-card flat>
                <v-card-title class="text-h5 font-weight-bold mb-4">
                  Projects
                </v-card-title>

                <v-card-text>
                  <ProjectsList />
                </v-card-text>
              </v-card>
            </div>

            <!-- Notifications Section -->
            <div
              ref="notificationsSection"
              style="min-height: calc(100vh - 120px);"
            >
              <v-card flat>
                <v-card-title class="text-h5 font-weight-bold mb-4">
                  Notifications
                </v-card-title>

                <v-card-text>
                  <NotificationPreferences />
                </v-card-text>
              </v-card>
            </div>

            <!-- Quota Usage Section -->
            <div
              ref="quotaSection"
              style="min-height: calc(100vh - 120px);"
            >
              <v-card flat>
                <v-card-title class="text-h5 font-weight-bold mb-4">
                  Quota Usage
                </v-card-title>

                <v-card-text>
                  <div
                    v-for="(project, index) in projects"
                    :key="project.project_id"
                    :class="{'mb-4': index < projects.length - 1}"
                  >
                    <v-card variant="elevated">
                      <QuotaUsage
                        :project-id="project.project_id"
                        :project-name="project.name"
                        :environment="project.environment"
                        :quota-data="quotaStore.getQuotaForProject(project.project_id).value"
                        :is-loading="quotaStore.isLoadingForProject(project.project_id).value"
                        @refresh="handleQuotaRefresh"
                      />
                    </v-card>
                  </div>

                  <v-alert
                    v-if="projects.length === 0 && !projectsStore.isLoading"
                    type="info"
                    class="mt-4"
                  >
                    No projects found. Create a project to view quota usage.
                  </v-alert>
                </v-card-text>
              </v-card>
            </div>

            <!-- API Keys Management Section -->
            <div
              ref="apiKeysSection"
              style="min-height: calc(100vh - 120px);"
            >
              <v-card flat>
                <v-card-title class="text-h5 font-weight-bold mb-4">
                  API Keys Management
                </v-card-title>

                <v-card-text class="h-100">
                  <ApiKeysList />
                </v-card-text>
              </v-card>
            </div>

            <!-- Account Settings Section -->
            <div
              ref="accountSection"
              style="min-height: calc(100vh - 120px);"
            >
              <v-card flat>
                <v-card-title class="text-h5 font-weight-bold mb-4">
                  Account Settings
                </v-card-title>

                <v-card-text>
                  <AccountSettings />
                </v-card-text>
              </v-card>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

definePageMeta({
  middleware: 'auth',
})

const quotaStore = useQuotaStore()
const projectsStore = useProjectsStore()
const { projects } = storeToRefs(projectsStore)

const apiKeysStore = useApiKeysStore()

const activeSection = ref<'projects' | 'notifications' | 'quota' | 'apiKeys' | 'account'>('projects')
const selectedProjectId = ref<number | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const projectsSection = ref<HTMLElement | null>(null)
const notificationsSection = ref<HTMLElement | null>(null)
const quotaSection = ref<HTMLElement | null>(null)
const apiKeysSection = ref<HTMLElement | null>(null)
const accountSection = ref<HTMLElement | null>(null)

let isScrolling = false

function scrollToSection(section: 'projects' | 'notifications' | 'quota' | 'apiKeys' | 'account') {
  if (!scrollContainer.value)
    return

  let targetElement: HTMLElement | null = null

  switch (section) {
    case 'projects':
      targetElement = projectsSection.value
      break
    case 'notifications':
      targetElement = notificationsSection.value
      break
    case 'quota':
      targetElement = quotaSection.value
      break
    case 'apiKeys':
      targetElement = apiKeysSection.value
      break
    case 'account':
      targetElement = accountSection.value
      break
  }

  if (targetElement && scrollContainer.value) {
    isScrolling = true
    activeSection.value = section

    const containerTop = scrollContainer.value.offsetTop
    const targetTop = targetElement.offsetTop - 30
    const scrollPosition = targetTop - containerTop

    scrollContainer.value.scrollTo({
      top: scrollPosition,
      behavior: 'smooth',
    })

    setTimeout(() => {
      isScrolling = false
    }, 1000)
  }
}

function handleScroll() {
  if (isScrolling || !scrollContainer.value)
    return

  const container = scrollContainer.value
  const scrollTop = container.scrollTop
  const offset = 100

  const notificationsOffset = notificationsSection.value?.offsetTop ?? 0
  const quotaOffset = quotaSection.value?.offsetTop ?? 0
  const apiKeysOffset = apiKeysSection.value?.offsetTop ?? 0
  const accountOffset = accountSection.value?.offsetTop ?? 0

  if (scrollTop < notificationsOffset - offset) {
    activeSection.value = 'projects'
  }
  else if (scrollTop < quotaOffset - offset) {
    activeSection.value = 'notifications'
  }
  else if (scrollTop < apiKeysOffset - offset) {
    activeSection.value = 'quota'
  }
  else if (scrollTop < accountOffset - offset) {
    activeSection.value = 'apiKeys'
  }
  else {
    activeSection.value = 'account'
  }
}

function handleQuotaRefresh(projectId: number) {
  quotaStore.refreshQuotaForProject(projectId)
}

function fetchQuotasForAllProjects() {
  projects.value.forEach((project) => {
    quotaStore.fetchQuotaForProject(project.project_id)
  })
}

async function fetchData() {
  await projectsStore.fetchProjects()
}

watch(projects, (newProjects) => {
  if (newProjects.length > 0) {
    fetchQuotasForAllProjects()

    if (selectedProjectId.value === null) {
      selectedProjectId.value = newProjects[0]!.project_id
      apiKeysStore.fetchApiKeys(selectedProjectId.value)
    }
  }
}, { immediate: true })

onMounted(() => {
  activeSection.value = 'projects'
  fetchData()
})
</script>
