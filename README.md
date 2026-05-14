<div align="center">

# Ledger Dashboard

### Beautiful, real-time log analytics in your browser

**The web interface that makes log management actually enjoyable.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Nuxt 3](https://img.shields.io/badge/Nuxt-3-00DC82.svg)](https://nuxt.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)

[Live Dashboard](https://ledger.jtuta.cloud) • [API Server](https://ledger-server.jtuta.cloud) • [Python SDK](https://github.com/JakubTuta/Ledger-SDK) • [Backend](https://github.com/JakubTuta/Ledger-APP) • [API Docs](https://ledger-server.jtuta.cloud/docs)

</div>

---

## See It Live

**Try it now: [ledger.jtuta.cloud](https://ledger.jtuta.cloud)**

No installation required. Create an account and start exploring your logs in seconds.

## What You Can Do

### Manage Your Projects

- **Create unlimited projects** - Separate logs for each application or environment
- **Per-project API keys** - Secure access control for each service
- **Real-time quota monitoring** - Track usage against your daily, hourly, and per-minute limits
- **Environment separation** - Organize by production, staging, development

### Explore Your Logs

- **Live log streaming** - Watch logs appear in real-time as your application runs
- **Lightning-fast search** - Full-text search across millions of logs in milliseconds
- **Advanced filtering** - Filter by level, time range, message content, or custom attributes
- **Smart grouping** - Automatically group similar logs to reduce noise
- **Time travel** - Jump to any point in your application's history

### Build Custom Dashboards

- **Drag-and-drop panels** - Create custom layouts for your monitoring needs
- **Multiple panel types** - Logs, metrics, error rates, and more
- **Save layouts** - Your custom dashboards persist across sessions
- **Share insights** - Export and share dashboard configurations with your team

### Track Errors Automatically

- **Error grouping** - Similar errors are automatically grouped together (like Sentry)
- **Stack traces** - Full error context with line numbers and file paths
- **Occurrence tracking** - See how often each error happens
- **First/last seen** - Know when errors appear and reappear
- **Quick filtering** - Jump straight to error logs with one click

### Manage API Keys

- **Create/revoke keys** - Generate new keys or revoke compromised ones instantly
- **Key visibility** - Keys are shown only once for security
- **Per-project keys** - Isolate access to individual projects
- **Usage tracking** - Monitor which keys are being used

### Control Your Account

- **Profile management** - Update your name, email, and password
- **Security settings** - Change password, view active sessions
- **Dark/light mode** - Choose your preferred theme
- **Responsive design** - Works perfectly on desktop, tablet, and mobile

## Tech Stack

Built with the latest and greatest web technologies:

- **[Nuxt 3](https://nuxt.com/)** - The Vue.js framework for modern web apps
- **[Vue 3](https://vuejs.org/)** - Progressive JavaScript framework with Composition API
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Vuetify 3](https://vuetifyjs.com/)** - Material Design component library
- **[Pinia](https://pinia.vuejs.org/)** - Modern state management for Vue
- **[UnoCSS](https://unocss.dev/)** - Instant on-demand atomic CSS engine
- **[VueUse](https://vueuse.org/)** - Collection of essential Vue composition utilities
- **[Axios](https://axios-http.com/)** - Promise-based HTTP client

## Quick Start

### Prerequisites

- **Node.js** 18+ (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- **bun** package manager ([install bun](https://bun.sh/))

### Installation

```bash
# Clone the repository
git clone https://github.com/JakubTuta/Ledger-WEB.git
cd Ledger-WEB

# Install dependencies
bun install

# Start development server
bun run dev
```

The dashboard will be available at `http://localhost:3000`.

### Environment Configuration

Create a `.env` file in the root directory:

```env
# API server URL
NUXT_PUBLIC_API_BASE_URL=https://ledger-server.jtuta.cloud

# Or for local development
# NUXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

That's it! The dashboard will automatically connect to the API server.

## Development

### Available Scripts

```bash
# Start development server with hot reload
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Generate static site
bun run generate

# Lint code
bun run lint

# Lint and fix issues
bun run lint:fix
```

### Project Structure

```
Ledger-WEB/
├── app/
│   ├── components/          # Reusable Vue components
│   │   ├── AppNavBar.vue   # Main navigation bar
│   │   ├── ProjectsList.vue # Project management
│   │   ├── ApiKeysList.vue # API key management
│   │   ├── PanelCard.vue   # Dashboard panels
│   │   └── ...
│   ├── pages/              # Nuxt pages (auto-routed)
│   │   ├── index.vue       # Dashboard home
│   │   ├── login.vue       # Login page
│   │   ├── register.vue    # Registration page
│   │   ├── panel.vue       # Custom panels view
│   │   └── account.vue     # Account settings
│   ├── stores/             # Pinia state management
│   ├── composables/        # Vue composables
│   └── app.vue             # Root component
├── public/                 # Static assets
├── nuxt.config.ts          # Nuxt configuration
└── package.json            # Dependencies
```

## Connecting to the API

The dashboard communicates with the Ledger API server:

- **Production API:** `https://ledger-server.jtuta.cloud`
- **API Documentation:** [bump.sh/tuta-corp/doc/ledger-api](https://ledger-server.jtuta.cloud/docs)
- **OpenAPI Spec:** `https://ledger-server.jtuta.cloud/openapi.json`

All API calls include automatic:
- JWT authentication headers
- Error handling with user-friendly messages
- Retry logic for transient failures
- 401 redirect to login page

## Ecosystem

Ledger is a complete observability platform:

- **[Python SDK](https://github.com/JakubTuta/Ledger-SDK)** - Official client library ([PyPI](https://pypi.org/project/ledger-sdk/))
- **[Backend Server](https://github.com/JakubTuta/Ledger-APP)** - FastAPI-based log ingestion and query API
- **[Web Dashboard](https://github.com/JakubTuta/Ledger-WEB)** - This repository
- **[API Documentation](https://ledger-server.jtuta.cloud/docs)** - Complete REST API reference

## Links

- **Live Dashboard:** [ledger.jtuta.cloud](https://ledger.jtuta.cloud)
- **API Server:** [ledger-server.jtuta.cloud](https://ledger-server.jtuta.cloud)
- **Python SDK:** [github.com/JakubTuta/Ledger-SDK](https://github.com/JakubTuta/Ledger-SDK)
- **Backend Source:** [github.com/JakubTuta/Ledger-APP](https://github.com/JakubTuta/Ledger-APP)
- **API Documentation:** [bump.sh/tuta-corp/doc/ledger-api](https://ledger-server.jtuta.cloud/docs)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
