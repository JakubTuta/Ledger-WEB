<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <v-container class="py-16">
        <v-row align="center">
          <v-col
            cols="12"
            md="6"
          >
            <v-chip
              color="primary"
              variant="tonal"
              class="mb-6"
              prepend-icon="mdi-circle"
              size="small"
            >
              OpenTelemetry-native observability for Python
            </v-chip>

            <h1 class="hero-title mb-6">
              See every request, error &amp; log
              <span class="gradient-text">from your Python backend</span>
            </h1>

            <p class="hero-subtitle mb-8">
              Add 3 lines of code. Get instant visibility into every HTTP request, exception,
              and custom log — all in a real-time dashboard you'll actually enjoy using.
              Built on OpenTelemetry, so any other language's OTel SDK works too.
            </p>

            <div class="d-flex flex-column flex-sm-row ga-3 mb-10">
              <v-btn
                size="x-large"
                color="primary"
                variant="flat"
                to="/register"
              >
                Get started free
                <v-icon end>
                  mdi-arrow-right
                </v-icon>
              </v-btn>

              <v-btn
                size="x-large"
                variant="outlined"
                to="/login"
              >
                Sign in
                <v-icon end>
                  mdi-login
                </v-icon>
              </v-btn>
            </div>

            <div class="hero-stats">
              <div class="stat-item">
                <div class="stat-number">
                  3 lines
                </div>

                <div class="stat-label">
                  To integrate
                </div>
              </div>

              <div class="stat-item">
                <div class="stat-number">
                  &lt;0.1ms
                </div>

                <div class="stat-label">
                  Per request
                </div>
              </div>

              <div class="stat-item">
                <div class="stat-number">
                  100%
                </div>

                <div class="stat-label">
                  Open source
                </div>
              </div>
            </div>
          </v-col>

          <v-col
            cols="12"
            md="6"
            class="d-none d-md-block"
          >
            <div class="dashboard-mock">
              <v-card
                class="mock-card mock-card-top"
                color="surface"
                elevation="12"
              >
                <v-card-text class="pa-5">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="text-caption text-medium-emphasis">
                      Request rate
                    </div>

                    <v-chip
                      color="success"
                      variant="tonal"
                      size="x-small"
                    >
                      Live
                    </v-chip>
                  </div>

                  <div class="text-h4 font-weight-bold mb-1">
                    1,284<span class="text-body-2 text-medium-emphasis">/min</span>
                  </div>

                  <div class="sparkline">
                    <div
                      v-for="(h, i) in sparkBars"
                      :key="i"
                      class="spark-bar"
                      :style="{'height': `${h}%`}"
                    />
                  </div>
                </v-card-text>
              </v-card>

              <v-card
                class="mock-card mock-card-bottom"
                color="surface"
                elevation="12"
              >
                <v-card-text class="pa-5">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="text-caption text-medium-emphasis">
                      Live request log
                    </div>

                    <v-icon
                      size="small"
                      color="primary"
                    >
                      mdi-pulse
                    </v-icon>
                  </div>

                  <div
                    v-for="row in mockLogs"
                    :key="row.path + row.time"
                    class="log-row"
                  >
                    <v-chip
                      :color="row.color"
                      variant="tonal"
                      size="x-small"
                      class="log-method"
                    >
                      {{ row.method }}
                    </v-chip>

                    <span class="log-path">{{ row.path }}</span>

                    <span class="log-status">{{ row.status }}</span>

                    <span class="log-time">{{ row.time }}</span>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Frameworks Band -->
    <section class="frameworks-band">
      <v-container class="py-8">
        <div class="d-flex align-center ga-8 flex-wrap justify-center">
          <span class="text-overline text-medium-emphasis">
            Works with
          </span>

          <div
            v-for="fw in frameworks"
            :key="fw.name"
            class="framework-item"
          >
            <v-icon
              :icon="fw.icon"
              size="24"
              class="mr-2"
            />

            <span class="font-weight-medium">{{ fw.name }}</span>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Features -->
    <section class="features-section">
      <v-container class="py-16">
        <div class="section-header mb-12 text-center">
          <v-chip
            color="primary"
            variant="tonal"
            size="small"
            class="mb-4"
          >
            Features
          </v-chip>

          <h2 class="section-title mb-3">
            Everything captured, nothing missed
          </h2>

          <p class="section-subtitle">
            The SDK automatically captures requests and exceptions. You focus on shipping — we handle the observability.
          </p>
        </div>

        <v-row>
          <v-col
            v-for="feature in features"
            :key="feature.title"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card
              class="feature-card h-100"
              color="surface"
              elevation="0"
              border
            >
              <v-card-text class="pa-6">
                <div class="feature-icon mb-4">
                  <v-icon
                    :color="feature.color"
                    size="32"
                  >
                    {{ feature.icon }}
                  </v-icon>
                </div>

                <h3 class="feature-title mb-2">
                  {{ feature.title }}
                </h3>

                <p class="feature-description">
                  {{ feature.description }}
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- How it Works -->
    <section class="how-it-works-section">
      <v-container class="py-16">
        <div class="section-header mb-12 text-center">
          <v-chip
            color="primary"
            variant="tonal"
            size="small"
            class="mb-4"
          >
            How it works
          </v-chip>

          <h2 class="section-title mb-3">
            Start monitoring in under 5 minutes
          </h2>

          <p class="section-subtitle">
            No complex setup. No infrastructure to manage. Install, configure, and go.
          </p>
        </div>

        <v-row>
          <v-col
            v-for="(step, index) in howItWorks"
            :key="step.title"
            cols="12"
            md="4"
          >
            <v-card
              class="step-card h-100"
              color="surface"
              elevation="0"
              border
            >
              <v-card-text class="pa-6">
                <div class="step-number mb-4">
                  {{ index + 1 }}
                </div>

                <h3 class="step-title mb-2">
                  {{ step.title }}
                </h3>

                <p class="step-description mb-4">
                  {{ step.description }}
                </p>

                <v-card
                  v-if="step.code"
                  class="code-card"
                  color="surface-variant-dark"
                  flat
                >
                  <v-card-text class="pa-3">
                    <pre class="code-block"><code>{{ step.code }}</code></pre>
                  </v-card-text>
                </v-card>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Code → Dashboard split -->
    <section class="code-dashboard-section">
      <v-container class="py-16">
        <div class="section-header mb-12 text-center">
          <v-chip
            color="primary"
            variant="tonal"
            size="small"
            class="mb-4"
          >
            From your code to your dashboard
          </v-chip>

          <h2 class="section-title mb-3">
            Three lines. Real visibility.
          </h2>

          <p class="section-subtitle">
            You write the highlighted lines. Ledger turns every request into a live stream of structured data.
          </p>
        </div>

        <v-row align="center">
          <v-col
            cols="12"
            md="6"
          >
            <v-card
              color="surface-variant-dark"
              flat
              class="snippet-card"
            >
              <v-card-text class="pa-6">
                <div class="snippet-header mb-3">
                  <v-icon
                    size="small"
                    color="primary"
                  >
                    mdi-language-python
                  </v-icon>

                  <span class="text-caption text-medium-emphasis ml-2">main.py</span>
                </div>

                <pre class="code-block"><code>from fastapi import FastAPI
<span class="hl">from ledger import LedgerClient</span>

<span class="hl">from ledger.integrations.fastapi import LedgerMiddleware</span>

app = FastAPI()
<span class="hl">ledger = LedgerClient(api_key="your_key")</span>

<span class="hl">app.add_middleware(LedgerMiddleware, ledger_client=ledger)</span>

@app.get("/users/{id}")
def get_user(id: int):
    return {"id": id}</code></pre>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            md="6"
          >
            <div class="dash-grid">
              <v-card
                color="surface"
                elevation="4"
                class="dash-stat"
              >
                <v-card-text class="pa-4">
                  <div class="text-caption text-medium-emphasis">
                    Throughput
                  </div>

                  <div class="text-h5 font-weight-bold">
                    24.1k<span class="text-body-2 text-medium-emphasis">/h</span>
                  </div>

                  <v-progress-linear
                    color="primary"
                    :model-value="78"
                    height="4"
                    rounded
                    class="mt-3"
                  />
                </v-card-text>
              </v-card>

              <v-card
                color="surface"
                elevation="4"
                class="dash-stat"
              >
                <v-card-text class="pa-4">
                  <div class="text-caption text-medium-emphasis">
                    Errors
                  </div>

                  <div class="text-h5 font-weight-bold text-error">
                    12<span class="text-body-2 text-medium-emphasis">/h</span>
                  </div>

                  <v-progress-linear
                    color="error"
                    :model-value="14"
                    height="4"
                    rounded
                    class="mt-3"
                  />
                </v-card-text>
              </v-card>

              <v-card
                color="surface"
                elevation="4"
                class="dash-log"
              >
                <v-card-text class="pa-4">
                  <div class="text-caption text-medium-emphasis mb-3">
                    Recent requests
                  </div>

                  <div
                    v-for="row in mockLogs"
                    :key="`d-${row.path}-${row.time}`"
                    class="log-row"
                  >
                    <v-chip
                      :color="row.color"
                      variant="tonal"
                      size="x-small"
                      class="log-method"
                    >
                      {{ row.method }}
                    </v-chip>

                    <span class="log-path">{{ row.path }}</span>

                    <span class="log-status">{{ row.status }}</span>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Ecosystem -->
    <section class="ecosystem-section">
      <v-container class="py-16">
        <div class="section-header mb-12 text-center">
          <v-chip
            color="primary"
            variant="tonal"
            size="small"
            class="mb-4"
          >
            Open source
          </v-chip>

          <h2 class="section-title mb-3">
            Open source, top to bottom
          </h2>

          <p class="section-subtitle">
            Every component is open source. Use our hosted version or self-host the whole stack.
          </p>
        </div>

        <v-row>
          <v-col
            v-for="item in ecosystem"
            :key="item.title"
            cols="12"
            md="4"
          >
            <v-card
              class="ecosystem-card h-100"
              color="surface"
              elevation="0"

              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
              hover
              border
            >
              <v-card-text class="pa-6">
                <v-icon
                  :color="item.color"
                  size="40"
                  class="mb-4"
                >
                  {{ item.icon }}
                </v-icon>

                <h3 class="ecosystem-title mb-2">
                  {{ item.title }}
                </h3>

                <p class="ecosystem-description mb-4">
                  {{ item.description }}
                </p>

                <v-btn
                  variant="text"
                  color="primary"
                  size="small"
                >
                  {{ item.cta }}
                  <v-icon end>
                    mdi-arrow-right
                  </v-icon>
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <v-container class="py-16">
        <v-row justify="center">
          <v-col
            cols="12"
            md="8"
            class="text-center"
          >
            <h2 class="cta-title mb-6">
              Stop guessing what your backend is doing
            </h2>

            <p class="cta-subtitle on-primary mb-8">
              Create a free account, grab your API key, and see your first logs in under 5 minutes.
            </p>

            <div class="d-flex flex-column flex-sm-row ga-3 justify-center">
              <v-btn
                size="x-large"
                color="primary"
                variant="flat"
                to="/register"
              >
                Start monitoring now
                <v-icon end>
                  mdi-rocket-launch
                </v-icon>
              </v-btn>

              <v-btn
                size="x-large"
                variant="outlined"
                href="https://ledger-server.jtuta.cloud/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the docs
                <v-icon end>
                  mdi-book-open-variant
                </v-icon>
              </v-btn>
            </div>

            <p class="text-caption text-medium-emphasis mt-6">
              No credit card required
            </p>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <v-container class="py-12">
        <v-row>
          <v-col
            cols="12"
            md="4"
          >
            <div class="footer-brand mb-3">
              <v-icon size="28">
                mdi-chart-box-outline
              </v-icon>

              <span class="footer-title">Ledger</span>
            </div>

            <p class="footer-text mb-4">
              Open source, OpenTelemetry-native observability for Python backends. Built by developers, for developers.
            </p>

            <div class="d-flex ga-2">
              <v-btn
                icon
                variant="text"
                href="https://github.com/JakubTuta/Ledger-WEB"
                target="_blank"
                rel="noopener noreferrer"
              >
                <v-icon>mdi-github</v-icon>
              </v-btn>
            </div>
          </v-col>

          <v-col
            v-for="col in footerCols"
            :key="col.title"
            cols="6"
            md="2"
          >
            <h4 class="footer-col-title mb-3">
              {{ col.title }}
            </h4>

            <ul class="footer-list">
              <li
                v-for="link in col.links"
                :key="link.label"
              >
                <a
                  :href="link.href"
                  :target="link.external
                    ? '_blank'
                    : undefined"
                  :rel="link.external
                    ? 'noopener noreferrer'
                    : undefined"
                  class="footer-link"
                >
                  {{ link.label }}
                </a>
              </li>
            </ul>
          </v-col>
        </v-row>

        <v-divider class="my-8" />

        <div class="d-flex flex-column flex-sm-row align-center justify-space-between ga-3">
          <p class="text-caption text-medium-emphasis ma-0">
            © {{ new Date().getFullYear() }} Ledger Dashboard. MIT License.
          </p>

          <div class="d-flex align-center ga-2">
            <v-icon
              size="x-small"
              color="success"
            >
              mdi-circle
            </v-icon>

            <span class="text-caption text-medium-emphasis">All systems normal</span>
          </div>
        </div>
      </v-container>
    </footer>
  </div>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl as string

definePageMeta({})

useSeoMeta({
  title: 'Ledger — OpenTelemetry-Native Log Analytics for Python Backends',
  description: 'Open source, OpenTelemetry-native observability for Python. Add 3 lines of code to see every request, error, and trace in a real-time dashboard. Any other language\'s OTel SDK also works.',
  keywords: 'log analytics, python logging, fastapi monitoring, django logging, flask monitoring, opentelemetry, otlp, error tracking, application monitoring, open source logging, distributed tracing',

  ogType: 'website',
  ogTitle: 'Ledger — OpenTelemetry-Native Log Analytics for Python Backends',
  ogDescription: 'Open source, OpenTelemetry-native observability for Python. See every request, error, and trace in real-time. Any other language\'s OTel SDK works too.',
  ogUrl: siteUrl,
  ogSiteName: 'Ledger',
  ogLocale: 'en_US',
  ogImage: `${siteUrl}/og-image.png`,

  twitterCard: 'summary_large_image',
  twitterTitle: 'Ledger — OpenTelemetry-Native Log Analytics for Python Backends',
  twitterDescription: 'Open source, OpenTelemetry-native observability for Python. Add 3 lines of code to get started. Any other OTel SDK works too.',
  twitterImage: `${siteUrl}/og-image.png`,
})

useHead({
  titleTemplate: '',
})

useHead({
  link: [
    { rel: 'canonical', href: siteUrl },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': 'Ledger',
        'applicationCategory': 'DeveloperApplication',
        'operatingSystem': 'Web',
        'description': 'Open source, OpenTelemetry-native log analytics platform for Python. Monitor FastAPI, Django, and Flask applications with automatic request logging, exception tracking, and real-time dashboards. Any other language\'s OpenTelemetry SDK also works.',
        'url': siteUrl,
        'author': {
          '@type': 'Organization',
          'name': 'Ledger Team',
          'url': siteUrl,
        },
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
        },
        'featureList': [
          'Automatic HTTP request logging',
          'Exception tracking with stack traces',
          'Custom log messages with attributes',
          'Real-time dashboard',
          'Per-project API keys',
          'FastAPI, Django, Flask support',
        ],
        'license': 'https://opensource.org/licenses/MIT',
      }),
    },
  ],
})

const sparkBars = [30, 45, 38, 60, 52, 70, 58, 82, 68, 90, 75, 95]

const mockLogs = [
  { method: 'GET', color: 'success', path: '/api/users/42', status: '200', time: '12ms' },
  { method: 'POST', color: 'info', path: '/api/orders', status: '201', time: '38ms' },
  { method: 'GET', color: 'success', path: '/api/products', status: '200', time: '8ms' },
  { method: 'DELETE', color: 'error', path: '/api/sessions/9', status: '500', time: '142ms' },
  { method: 'POST', color: 'info', path: '/api/auth/login', status: '200', time: '24ms' },
]

const frameworks = [
  { name: 'Python', icon: 'mdi-language-python' },
  { name: 'FastAPI', icon: 'mdi-flash' },
  { name: 'Django', icon: 'mdi-leaf' },
  { name: 'Flask', icon: 'mdi-bottle-tonic' },
  { name: 'OpenTelemetry', icon: 'mdi-vector-polyline' },
]

const features = [
  {
    icon: 'mdi-clock-fast',
    color: 'primary',
    title: 'Automatic request logging',
    description: 'Every HTTP request captured — method, path, status, duration, headers. No manual instrumentation.',
  },
  {
    icon: 'mdi-bug',
    color: 'error',
    title: 'Exception tracking',
    description: 'Exceptions caught with full stack traces, grouped by type, tracked over time. Know what broke and when.',
  },
  {
    icon: 'mdi-text-box-outline',
    color: 'info',
    title: 'Custom log messages',
    description: 'Add context with ledger.log_info() and ledger.log_error(). Attach attributes like user IDs or order amounts.',
  },
  {
    icon: 'mdi-speedometer',
    color: 'accent',
    title: 'Performance insights',
    description: 'Identify slow endpoints with response time tracking. See which routes are bottlenecks and need optimization.',
  },
  {
    icon: 'mdi-filter-variant',
    color: 'success',
    title: 'Powerful filtering',
    description: 'Filter logs by level, endpoint, time range, or custom attributes. Find the needle in seconds.',
  },
  {
    icon: 'mdi-key',
    color: 'warning',
    title: 'Per-project API keys',
    description: 'Separate API keys for each project or environment. Revoke access instantly without affecting others.',
  },
]

const howItWorks = [
  {
    title: 'Install the SDK',
    description: 'One command. Supports Python 3.10+.',
    code: 'pip install ledger-sdk',
  },
  {
    title: 'Add the middleware',
    description: 'Drop in our middleware for FastAPI, Django, or Flask.',
    code: `from ledger import LedgerClient
from ledger.integrations.fastapi import LedgerMiddleware

ledger = LedgerClient(api_key="your_key")
app.add_middleware(LedgerMiddleware, ledger_client=ledger)`,
  },
  {
    title: 'See your logs',
    description: 'Every request, response, and exception appears in your dashboard instantly.',
    code: null,
  },
  {
    title: 'Or use any OpenTelemetry SDK',
    description: 'Not on Python? Point any language\'s stock OTel SDK at Ledger — no Ledger-specific package required.',
    code: `OTEL_EXPORTER_OTLP_ENDPOINT=https://ledger-server.jtuta.cloud
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer ledger_<api-key>`,
  },
]

const ecosystem = [
  {
    icon: 'mdi-language-python',
    color: 'info',
    title: 'Python SDK',
    description: 'pip install ledger-sdk — supports FastAPI, Django, Flask, Starlette, Litestar.',
    cta: 'View on GitHub',
    link: 'https://github.com/JakubTuta/Ledger-SDK',
  },
  {
    icon: 'mdi-vector-polyline',
    color: 'accent',
    title: 'Any OpenTelemetry SDK',
    description: 'Ledger accepts standard OTLP/HTTP traces and logs, so Go, Java, Node, and every other OTel SDK works out of the box.',
    cta: 'OTLP setup guide',
    link: 'https://github.com/JakubTuta/Ledger-APP#otlp',
  },
  {
    icon: 'mdi-server',
    color: 'success',
    title: 'Self-host server',
    description: 'Run your own Ledger instance. Full control over your data, easy Docker deploy.',
    cta: 'Deploy guide',
    link: 'https://github.com/JakubTuta/Ledger-APP',
  },
  {
    icon: 'mdi-file-document',
    color: 'warning',
    title: 'REST API',
    description: 'Build custom integrations with our fully documented REST API.',
    cta: 'API reference',
    link: 'https://ledger-server.jtuta.cloud/docs',
  },
]

const footerCols = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Sign in', href: '/login' },
      { label: 'Register', href: '/register' },
    ],
  },
  {
    title: 'Docs',
    links: [
      { label: 'Quickstart', href: 'https://github.com/JakubTuta/Ledger-SDK', external: true },
      { label: 'Python SDK', href: 'https://github.com/JakubTuta/Ledger-SDK', external: true },
      { label: 'REST API', href: 'https://ledger-server.jtuta.cloud/docs', external: true },
      { label: 'Self-hosting', href: 'https://github.com/JakubTuta/Ledger-APP', external: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub', href: 'https://github.com/JakubTuta/Ledger-WEB', external: true },
      { label: 'Server repo', href: 'https://github.com/JakubTuta/Ledger-APP', external: true },
      { label: 'SDK repo', href: 'https://github.com/JakubTuta/Ledger-SDK', external: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: 'https://github.com/JakubTuta', external: true },
      { label: 'Contact', href: 'mailto:jakubtutaxdd@gmail.com', external: true },
    ],
  },
]
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
}

/* Hero */
.hero-section {
  background: radial-gradient(circle at 20% 20%, rgba(var(--v-theme-primary), 0.18) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(var(--v-theme-secondary), 0.15) 0%, transparent 50%),
              rgb(var(--v-theme-background));
  position: relative;
  overflow: hidden;
  min-height: 90vh;
  display: flex;
  align-items: center;
}

.hero-title {
  font-size: clamp(2.25rem, 4.5vw, 3.75rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-accent)) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-block;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: rgb(var(--v-theme-on-surface-variant));
  max-width: 560px;
  line-height: 1.6;
}

.hero-stats {
  display: flex;
  gap: 2.5rem;
  flex-wrap: wrap;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-background));
  line-height: 1.1;
}

.stat-label {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
}

/* Dashboard mock */
.dashboard-mock {
  position: relative;
  height: 480px;
}

.mock-card {
  position: absolute;
  border-radius: 16px !important;
}

.mock-card-top {
  top: 0;
  right: 0;
  width: 70%;
  z-index: 2;
}

.mock-card-bottom {
  bottom: 0;
  left: 0;
  width: 80%;
  z-index: 1;
}

.sparkline {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 48px;
  margin-top: 8px;
}

.spark-bar {
  flex: 1;
  background: linear-gradient(180deg, rgb(var(--v-theme-primary)) 0%, rgba(var(--v-theme-primary), 0.3) 100%);
  border-radius: 2px;
  min-height: 6px;
  transition: height 0.3s ease;
}

.log-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.8125rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.log-row:last-child {
  border-bottom: none;
}

.log-method {
  min-width: 56px;
  justify-content: center;
}

.log-path {
  flex: 1;
  font-family: 'Fira Code', 'Consolas', monospace;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-status {
  color: rgb(var(--v-theme-on-surface-variant));
  font-family: monospace;
}

.log-time {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.75rem;
  min-width: 48px;
  text-align: right;
}

/* Frameworks band */
.frameworks-band {
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.framework-item {
  display: flex;
  align-items: center;
  color: rgb(var(--v-theme-on-surface-variant));
}

/* Sections shared */
.section-header {
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}

.section-title {
  font-size: clamp(1.75rem, 3.5vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.section-subtitle {
  font-size: 1.0625rem;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.6;
}

/* Features */
.features-section {
  background: rgb(var(--v-theme-background));
}

.feature-card {
  transition: all 0.25s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--v-theme-primary), 0.5) !important;
}

.feature-icon {
  display: inline-flex;
  padding: 0.75rem;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 12px;
}

.feature-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.feature-description {
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.6;
  font-size: 0.9375rem;
}

/* How it works */
.how-it-works-section {
  background: rgb(var(--v-theme-surface));
}

.step-card {
  transition: all 0.25s ease;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
  border-radius: 12px;
  font-size: 1.125rem;
  font-weight: 700;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.step-description {
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.6;
  font-size: 0.9375rem;
}

.code-card {
  border-radius: 8px !important;
}

.code-block {
  margin: 0;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.78rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgb(var(--v-theme-on-surface));
}

/* Code → dashboard split */
.code-dashboard-section {
  background: rgb(var(--v-theme-background));
}

.snippet-card {
  border-radius: 16px !important;
}

.snippet-header {
  display: flex;
  align-items: center;
}

.code-block :deep(.hl),
.code-block .hl {
  background: rgba(var(--v-theme-primary), 0.18);
  color: rgb(var(--v-theme-primary));
  border-radius: 4px;
  padding: 1px 4px;
  display: inline-block;
  width: fit-content;
}

.dash-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dash-log {
  grid-column: span 2;
}

/* Ecosystem */
.ecosystem-section {
  background: rgb(var(--v-theme-surface));
}

.ecosystem-card {
  transition: all 0.25s ease;
  text-decoration: none;
}

.ecosystem-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--v-theme-primary), 0.5) !important;
}

.ecosystem-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.ecosystem-description {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.9375rem;
  line-height: 1.6;
}

/* CTA */
.cta-section {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.18) 0%, rgba(var(--v-theme-secondary), 0.18) 100%);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.cta-title {
  font-size: clamp(1.75rem, 3.5vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.cta-subtitle {
  font-size: 1.0625rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

/* Footer */
.landing-footer {
  background: rgb(var(--v-theme-surface-variant-dark));
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.footer-text {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.875rem;
  line-height: 1.6;
  max-width: 320px;
}

.footer-col-title {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--v-theme-on-surface));
}

.footer-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-list li {
  margin-bottom: 0.5rem;
}

.footer-link {
  color: rgb(var(--v-theme-on-surface-variant));
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: rgb(var(--v-theme-primary));
}

@media (max-width: 600px) {
  .dashboard-mock {
    display: none;
  }
}
</style>
