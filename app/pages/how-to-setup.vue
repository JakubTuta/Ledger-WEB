<template>
  <div class="setup-page">
    <section class="setup-hero">
      <v-container class="py-12">
        <v-row justify="center">
          <v-col
            cols="12"
            md="9"
            class="text-center"
          >
            <v-chip
              color="primary"
              variant="tonal"
              size="small"
              class="mb-4"
              prepend-icon="mdi-book-open-variant"
            >
              Setup guide
            </v-chip>

            <h1 class="setup-title mb-4">
              Start sending data in under 5 minutes
            </h1>

            <p class="setup-subtitle mb-6">
              Pick your integration below. Every step is copyable — install the SDK, add the
              middleware, and watch requests, errors, metrics and traces land in your dashboard.
            </p>

            <div class="d-flex flex-column flex-sm-row ga-3 justify-center">
              <v-btn
                color="primary"
                variant="flat"
                size="large"
                to="/register"
              >
                Get an API key
                <v-icon end>
                  mdi-key
                </v-icon>
              </v-btn>

              <v-btn
                variant="outlined"
                size="large"
                href="https://bump.sh/tuta-corp/doc/ledger-api/"
                target="_blank"
                rel="noopener noreferrer"
              >
                API reference
                <v-icon end>
                  mdi-open-in-new
                </v-icon>
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <v-container class="py-10">
      <v-card
        color="surface"
        elevation="0"
        border
        class="rounded-lg"
      >
        <v-tabs
          v-model="activeTab"
          color="primary"
          show-arrows
          class="setup-tabs"
        >
          <v-tab
            v-for="guide in setupGuides"
            :key="guide.key"
            :value="guide.key"
            :prepend-icon="guide.icon"
          >
            {{ guide.title }}
          </v-tab>
        </v-tabs>

        <v-divider />

        <v-tabs-window v-model="activeTab">
          <v-tabs-window-item
            v-for="guide in setupGuides"
            :key="guide.key"
            :value="guide.key"
          >
            <v-card-text class="pa-6">
              <v-alert
                type="info"
                variant="tonal"
                density="comfortable"
                class="mb-6"
                :text="guide.summary"
              />

              <SetupStepList :steps="guide.steps" />
            </v-card-text>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card>

      <v-row class="mt-8">
        <v-col
          v-for="resource in resources"
          :key="resource.title"
          cols="12"
          md="4"
        >
          <v-card
            class="resource-card h-100"
            color="surface"
            elevation="0"
            border
            :href="resource.link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <v-card-text class="pa-5">
              <v-icon
                :icon="resource.icon"
                color="primary"
                size="28"
                class="mb-3"
              />

              <h3 class="text-subtitle-1 font-weight-bold mb-1">
                {{ resource.title }}
              </h3>

              <p class="text-body-2 text-medium-emphasis ma-0">
                {{ resource.description }}
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl as string

const activeTab = ref('basic')

const route = useRoute()

onMounted(() => {
  const requested = route.hash.replace('#', '')

  if (setupGuides.some(guide => guide.key === requested))
    activeTab.value = requested
})

const resources = [
  {
    icon: 'mdi-language-python',
    title: 'Python SDK on GitHub',
    description: 'Source, examples and the full API surface for ledger-sdk.',
    link: 'https://github.com/JakubTuta/Ledger-SDK',
  },
  {
    icon: 'mdi-server',
    title: 'Self-host the server',
    description: 'Run your own Ledger instance with Docker. Full control over your data.',
    link: 'https://github.com/JakubTuta/Ledger-APP',
  },
  {
    icon: 'mdi-file-document-outline',
    title: 'REST API reference',
    description: 'Every endpoint documented, including OTLP ingestion routes.',
    link: 'https://bump.sh/tuta-corp/doc/ledger-api/',
  },
]

useSeoMeta({
  title: 'How to set up Ledger — SDK, metrics, tracing & OpenTelemetry',
  description: 'Step-by-step setup guide for Ledger: install the Python SDK, add FastAPI/Django/Flask middleware, emit custom metrics, enable distributed tracing, or point any OpenTelemetry SDK at Ledger.',
  keywords: 'ledger setup, python sdk setup, fastapi logging setup, django logging, flask monitoring, opentelemetry otlp setup, distributed tracing setup, custom metrics',

  ogType: 'article',
  ogTitle: 'How to set up Ledger — SDK, metrics, tracing & OpenTelemetry',
  ogDescription: 'Copyable, step-by-step instructions for every Ledger integration: basic SDK setup, metrics, tracing and any OpenTelemetry SDK.',
  ogUrl: `${siteUrl}/how-to-setup`,
  ogSiteName: 'Ledger',
  ogImage: `${siteUrl}/og-image.png`,

  twitterCard: 'summary_large_image',
  twitterTitle: 'How to set up Ledger',
  twitterDescription: 'Copyable, step-by-step setup for the Ledger SDK, metrics, tracing and OpenTelemetry.',
  twitterImage: `${siteUrl}/og-image.png`,
})

useHead({
  titleTemplate: '',
  link: [
    { rel: 'canonical', href: `${siteUrl}/how-to-setup` },
  ],
})
</script>

<style scoped>
.setup-hero {
  background: radial-gradient(circle at 30% 20%, rgba(var(--v-theme-primary), 0.16) 0%, transparent 55%),
              rgb(var(--v-theme-background));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.setup-title {
  font-size: clamp(1.9rem, 3.8vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.setup-subtitle {
  font-size: 1.0625rem;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.6;
  max-width: 680px;
  margin-inline: auto;
}

.resource-card {
  text-decoration: none;
  transition: all 0.25s ease;
}

.resource-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--v-theme-primary), 0.5) !important;
}
</style>
