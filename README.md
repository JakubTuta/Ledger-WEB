<div align="center">

# Ledger Dashboard

### Beautiful, real-time log analytics in your browser

**The web interface that makes log management actually enjoyable.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Nuxt 3](https://img.shields.io/badge/Nuxt-3-00DC82.svg)](https://nuxt.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D.svg)](https://vuejs.org/)

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

### Track Errors Automatically

- **Error grouping** - Similar errors are automatically grouped together (like Sentry)
- **Stack traces** - Full error context with line numbers and file paths
- **Occurrence tracking** - See how often each error happens
- **First/last seen** - Know when errors appear and reappear

### Manage API Keys

- **Create/revoke keys** - Generate new keys or revoke compromised ones instantly
- **Regenerate keys** - Issue replacement keys without losing access
- **Key visibility** - Keys are shown only once for security
- **Per-project keys** - Isolate access to individual projects

### Control Your Account

- **Profile management** - Update your name, email, and password
- **Dark/light mode** - Choose your preferred theme
- **Responsive design** - Works perfectly on desktop, tablet, and mobile

## Quick Start

### Prerequisites

- **Node.js** 18+
- **bun** package manager ([install bun](https://bun.sh/))

### Installation

```bash
git clone https://github.com/JakubTuta/Ledger-WEB.git
cd Ledger-WEB

bun install
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

### Available Scripts

```bash
bun run dev        # Start development server with hot reload
bun run build      # Build for production
bun run preview    # Preview production build
bun run lint       # Lint code
bun run lint:fix   # Lint and fix issues
```

## Ecosystem

Ledger is a complete observability platform:

- **[Python SDK](https://github.com/JakubTuta/Ledger-SDK)** - Official client library ([PyPI](https://pypi.org/project/ledger-sdk/))
- **[Backend Server](https://github.com/JakubTuta/Ledger-APP)** - FastAPI-based log ingestion and query API
- **[API Documentation](https://ledger-server.jtuta.cloud/docs)** - Complete REST API reference

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
