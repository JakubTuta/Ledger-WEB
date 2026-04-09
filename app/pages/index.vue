<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section h-95vh">
      <v-container class="py-16">
        <v-row
          align="center"
          justify="center"
        >
          <v-col
            cols="12"
            md="8"
            lg="6"
            class="text-center"
          >
            <v-chip
              color="white"
              variant="outlined"
              class="hero-badge mb-4"
            >
              For Python developers using FastAPI, Django & Flask
            </v-chip>

            <h1 class="hero-title mb-6">
              See every request, error & log
              <span class="gradient-text">from your Python backend</span>
            </h1>

            <p class="hero-subtitle mb-8">
              Add 3 lines of code to your app. Get instant visibility into every HTTP request,
              exception, and custom log — all in a real-time dashboard you'll actually enjoy using.
            </p>

            <div class="hero-actions">
              <v-btn
                size="x-large"
                color="primary"
                variant="flat"
                class="mb-4 mr-4"
                to="/register"
              >
                Get Started Free
                <v-icon end>
                  mdi-arrow-right
                </v-icon>
              </v-btn>

              <v-btn
                size="x-large"
                variant="outlined"
                class="mb-4"
                to="/login"
              >
                Sign In
                <v-icon end>
                  mdi-login
                </v-icon>
              </v-btn>
            </div>

            <div class="hero-stats mt-8">
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
                  Overhead per request
                </div>
              </div>

              <div class="stat-item">
                <div class="stat-number">
                  100%
                </div>

                <div class="stat-label">
                  Open Source
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- How it Works Section -->
    <section class="how-it-works-section">
      <v-container class="py-16">
        <div class="section-header mb-12 text-center">
          <h2 class="section-title">
            Start monitoring in under 5 minutes
          </h2>

          <p class="section-subtitle">
            No complex setup. No infrastructure to manage. Just install, configure, and go.
          </p>
        </div>

        <v-row justify="center">
          <v-col
            v-for="(step, index) in howItWorks"
            :key="step.title"
            cols="12"
            md="4"
          >
            <div class="step-card text-center">
              <div class="step-number mb-4">
                {{ index + 1 }}
              </div>

              <h3 class="step-title mb-3">
                {{ step.title }}
              </h3>

              <p class="step-description mb-4">
                {{ step.description }}
              </p>

              <v-card
                v-if="step.code"
                class="code-card"
                color="grey-darken-4"
              >
                <v-card-text class="pa-4">
                  <pre class="code-block"><code>{{ step.code }}</code></pre>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <v-container class="py-16">
        <div class="section-header mb-12 text-center">
          <h2 class="section-title">
            Everything captured, nothing missed
          </h2>

          <p class="section-subtitle">
            The SDK automatically captures requests and exceptions. You focus on building — we handle the observability.
          </p>
        </div>

        <v-row justify="center">
          <v-col
            v-for="feature in features"
            :key="feature.title"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card
              class="feature-card h-100"
              elevation="0"
              border
            >
              <v-card-text class="pa-6">
                <div class="feature-icon mb-4">
                  <v-icon
                    :color="feature.color"
                    size="48"
                  >
                    {{ feature.icon }}
                  </v-icon>
                </div>

                <h3 class="feature-title mb-3">
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

    <!-- Ecosystem Section -->
    <section class="ecosystem-section">
      <v-container class="py-16">
        <div class="section-header mb-12 text-center">
          <h2 class="section-title">
            Open source, top to bottom
          </h2>

          <p class="section-subtitle">
            Every component is open source. Use our hosted version or self-host everything.
          </p>
        </div>

        <v-row justify="center">
          <v-col
            v-for="item in ecosystem"
            :key="item.title"
            cols="12"
            md="6"
            lg="3"
          >
            <v-card
              class="ecosystem-card h-100"
              elevation="2"
              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
              hover
            >
              <v-card-text class="pa-6 text-center">
                <v-icon
                  :color="item.color"
                  size="56"
                  class="mb-4"
                >
                  {{ item.icon }}
                </v-icon>

                <h3 class="ecosystem-title mb-2">
                  {{ item.title }}
                </h3>

                <p class="ecosystem-description">
                  {{ item.description }}
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA Section -->
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

            <p class="cta-subtitle mb-8">
              Create a free account, grab your API key, and see your first logs in under 5 minutes.
            </p>

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
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <v-container class="py-8">
        <v-row align="center">
          <v-col
            cols="12"
            md="6"
            class="text-md-left text-center"
          >
            <div class="footer-brand mb-md-0 mb-4">
              <v-icon
                size="32"
                class="mr-2"
              >
                mdi-chart-box-outline
              </v-icon>

              <span class="footer-title">Ledger Dashboard</span>
            </div>

            <p class="footer-text mt-2">
              Open source log analytics platform
            </p>
          </v-col>

          <v-col
            cols="12"
            md="6"
            class="text-md-right text-center"
          >
            <v-btn
              variant="text"
              href="https://github.com/JakubTuta/Ledger-WEB"
              target="_blank"
              rel="noopener noreferrer"
              class="mr-2"
            >
              <v-icon start>
                mdi-github
              </v-icon>
              View on GitHub
            </v-btn>

            <v-btn
              variant="text"
              href="https://bump.sh/tuta-corp/doc/ledger-api/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <v-icon start>
                mdi-file-document
              </v-icon>
              API Docs
            </v-btn>
          </v-col>
        </v-row>

        <v-divider class="my-6" />

        <div class="footer-copyright text-center">
          <p class="text-grey">
            © {{ new Date().getFullYear() }} Ledger Dashboard. Open source under MIT License.
          </p>
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
  title: 'Ledger — Log Analytics for Python Backends',
  description: 'Open source log monitoring for FastAPI, Django, and Flask. Add 3 lines of code to see every request, error, and custom log in a real-time dashboard.',
  keywords: 'log analytics, python logging, fastapi monitoring, django logging, flask monitoring, error tracking, application monitoring, open source logging',

  ogType: 'website',
  ogTitle: 'Ledger — Log Analytics for Python Backends',
  ogDescription: 'Open source log monitoring for FastAPI, Django, and Flask. See every request, error, and custom log in real-time.',
  ogUrl: siteUrl,
  ogSiteName: 'Ledger',
  ogLocale: 'en_US',
  ogImage: `${siteUrl}/og-image.png`,

  twitterCard: 'summary_large_image',
  twitterTitle: 'Ledger — Log Analytics for Python Backends',
  twitterDescription: 'Open source log monitoring for FastAPI, Django, and Flask. Add 3 lines of code to get started.',
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
        'description': 'Open source log analytics platform for Python backends. Monitor FastAPI, Django, and Flask applications with automatic request logging, exception tracking, and real-time dashboards.',
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

const howItWorks = [
  {
    title: 'Install the SDK',
    description: 'One command to add Ledger to your Python project. Supports Python 3.10+.',
    code: 'pip install ledger-sdk',
  },
  {
    title: 'Add the middleware',
    description: 'Drop in our middleware for FastAPI, Django, or Flask. Auto-captures all requests.',
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
]

const features = [
  {
    icon: 'mdi-clock-fast',
    color: 'primary',
    title: 'Automatic Request Logging',
    description: 'Every HTTP request is captured automatically — method, path, status code, duration, and headers. No manual instrumentation needed.',
  },
  {
    icon: 'mdi-bug',
    color: 'error',
    title: 'Exception Tracking',
    description: 'Exceptions are caught with full stack traces, grouped by type, and tracked over time. Know exactly what broke and when.',
  },
  {
    icon: 'mdi-text-box-outline',
    color: 'info',
    title: 'Custom Log Messages',
    description: 'Add context with ledger.log_info() and ledger.log_error(). Attach custom attributes like user IDs, order amounts, or any metadata.',
  },
  {
    icon: 'mdi-key',
    color: 'warning',
    title: 'Per-Project API Keys',
    description: 'Create separate API keys for each project or environment. Revoke access instantly without affecting other projects.',
  },
  {
    icon: 'mdi-speedometer',
    color: 'purple',
    title: 'Performance Insights',
    description: 'Identify slow endpoints with response time tracking. See which routes are bottlenecks and need optimization.',
  },
  {
    icon: 'mdi-filter-variant',
    color: 'success',
    title: 'Powerful Filtering',
    description: 'Filter logs by level, endpoint, time range, or custom attributes. Find the needle in the haystack in seconds.',
  },
]

const ecosystem = [
  {
    icon: 'mdi-language-python',
    color: 'info',
    title: 'Python SDK',
    description: 'pip install ledger-sdk — supports FastAPI, Django, Flask',
    link: 'https://github.com/JakubTuta/Ledger-SDK',
  },
  {
    icon: 'mdi-server',
    color: 'success',
    title: 'Self-host the Server',
    description: 'Run your own Ledger instance — full control over your data',
    link: 'https://github.com/JakubTuta/Ledger-APP',
  },
  {
    icon: 'mdi-file-document',
    color: 'warning',
    title: 'REST API Docs',
    description: 'Build custom integrations with our documented API',
    link: 'https://bump.sh/tuta-corp/doc/ledger-api/',
  },
]
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
  position: relative;
  overflow: hidden;
  min-height: 80vh;
  display: flex;
  align-items: center;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.3;
}

.hero-badge {
  animation: fadeInDown 0.6s ease-out;
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.2;
  color: white;
  animation: fadeInUp 0.8s ease-out;
}

.gradient-text {
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  animation: fadeInUp 1s ease-out;
}

.hero-actions {
  animation: fadeInUp 1.2s ease-out;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
  animation: fadeInUp 1.4s ease-out;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* How it Works Section */
.how-it-works-section {
  background: rgb(var(--v-theme-surface));
}

.step-card {
  padding: 1.5rem;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgb(var(--v-theme-primary));
  color: white;
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: 700;
}

.step-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.step-description {
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.6;
}

.code-card {
  text-align: left;
  border-radius: 8px;
}

.code-block {
  margin: 0;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: #e0e0e0;
}

/* Features Section */
.features-section {
  background: rgb(var(--v-theme-background));
}

.section-header {
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.section-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  margin-bottom: 1rem;
}

.section-subtitle {
  font-size: 1.125rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.feature-card {
  transition: all 0.3s ease;
  height: 100%;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
}

.feature-icon {
  display: inline-flex;
  padding: 1rem;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 16px;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.feature-description {
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.6;
}

/* Tech Stack Section */
.tech-section {
  background: linear-gradient(180deg, rgb(var(--v-theme-surface)) 0%, rgb(var(--v-theme-background)) 100%);
}

.tech-item {
  text-align: center;
  padding: 1.5rem;
  transition: transform 0.3s ease;
}

.tech-item:hover {
  transform: scale(1.1);
}

.tech-name {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

/* Ecosystem Section */
.ecosystem-section {
  background: rgb(var(--v-theme-background));
}

.ecosystem-card {
  transition: all 0.3s ease;
  text-decoration: none;
}

.ecosystem-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.2) !important;
}

.ecosystem-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.ecosystem-description {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.875rem;
}

/* CTA Section */
.cta-section {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
  position: relative;
}

.cta-title {
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: 700;
  color: white;
}

.cta-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.9);
}

/* Footer */
.landing-footer {
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

@media (min-width: 960px) {
  .footer-brand {
    justify-content: flex-start;
  }
}

.footer-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.footer-text {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.875rem;
}

.footer-copyright {
  font-size: 0.875rem;
}

/* Animations */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
