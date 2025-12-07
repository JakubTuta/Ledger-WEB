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
            <h1 class="hero-title mb-6">
              Beautiful log analytics
              <span class="gradient-text">in your browser</span>
            </h1>

            <p class="hero-subtitle mb-8">
              The web interface that makes log management actually enjoyable.
              Monitor, analyze, and debug your applications with real-time insights.
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
                  10,000
                </div>

                <div class="stat-label">
                  Logs Per Second
                </div>
              </div>

              <div class="stat-item">
                <div class="stat-number">
                  <v-icon>mdi-lightning-bolt</v-icon>
                </div>

                <div class="stat-label">
                  Lightning Fast
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

    <!-- Features Section -->
    <section class="features-section">
      <v-container class="py-16">
        <div class="section-header mb-12 text-center">
          <h2 class="section-title">
            Everything you need to monitor your applications
          </h2>

          <p class="section-subtitle">
            Powerful features designed for modern development teams
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
            Complete observability ecosystem
          </h2>

          <p class="section-subtitle">
            Seamlessly integrate with your workflow
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
              :to="item.link"
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
              Ready to transform your logging experience?
            </h2>

            <p class="cta-subtitle mb-8">
              Join developers who are already using Ledger to monitor their applications
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
              to="https://github.com/JakubTuta/Ledger-WEB"
              class="mr-2"
            >
              <v-icon start>
                mdi-github
              </v-icon>
              View on GitHub
            </v-btn>

            <v-btn
              variant="text"
              to="https://bump.sh/tuta-corp/doc/ledger-api/"
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
definePageMeta({
  middleware: 'guest',
})

const features = [
  {
    icon: 'mdi-clock-fast',
    color: 'primary',
    title: 'Real-time Monitoring',
    description: 'Watch logs appear instantly as your application runs. No delays, no waiting.',
  },
  {
    icon: 'mdi-view-dashboard',
    color: 'info',
    title: 'Custom Dashboards',
    description: 'Drag-and-drop panels to create personalized layouts that fit your workflow.',
  },
  {
    icon: 'mdi-bug',
    color: 'error',
    title: 'Error Tracking',
    description: 'Automatically group similar errors with stack traces and occurrence tracking.',
  },
  {
    icon: 'mdi-key',
    color: 'warning',
    title: 'API Key Management',
    description: 'Secure per-project access control with instant key generation and revocation.',
  },
  {
    icon: 'mdi-chart-line',
    color: 'purple',
    title: 'Analytics & Metrics',
    description: 'Visualize trends, track performance, and gain insights from your log data.',
  },
  {
    icon: 'mdi-speedometer',
    color: 'warning',
    title: 'Bottleneck Detection',
    description: 'Identify slow endpoints and performance issues with automated analysis.',
  },
]

const ecosystem = [
  {
    icon: 'mdi-language-python',
    color: 'info',
    title: 'Python SDK',
    description: 'Official client library',
    link: 'https://github.com/JakubTuta/Ledger-SDK',
  },
  {
    icon: 'mdi-server',
    color: 'success',
    title: 'Backend API',
    description: 'FastAPI-based server',
    link: 'https://github.com/JakubTuta/Ledger-APP',
  },
  {
    icon: 'mdi-file-document',
    color: 'warning',
    title: 'API Docs',
    description: 'Complete REST reference',
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

/* Features Section */
.features-section {
  background: rgb(var(--v-theme-surface));
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
