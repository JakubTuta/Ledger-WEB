import type { SetupGuide } from '~/types/setup'

const SERVER_URL = 'https://ledger-server.jtuta.cloud'

export const setupGuides: SetupGuide[] = [
  {
    key: 'basic',
    title: 'Basic setup',
    icon: 'mdi-rocket-launch-outline',
    summary: 'Install the Python SDK, plug in the middleware for your framework, and see your first requests and exceptions in the dashboard.',
    steps: [
      {
        title: 'Install the SDK',
        description: 'Python 3.10+ required. Supports FastAPI, Django, Flask, Starlette and Litestar.',
        code: 'pip install ledger-sdk',
        label: 'bash',
        icon: 'mdi-console',
      },
      {
        title: 'Create a project and API key',
        description: 'Sign in to the dashboard, create a project, then generate an API key under Settings. The key is shown only once — copy it now.',
      },
      {
        title: 'Store the key in your environment',
        description: 'Never hardcode the key in source control.',
        code: `export LEDGER_API_KEY="ledger_proj_1_your_api_key"
export LEDGER_BASE_URL="${SERVER_URL}"`,
        label: 'bash',
        icon: 'mdi-console',
      },
      {
        title: 'Add the middleware — FastAPI',
        description: 'Every request, response and exception is captured automatically.',
        code: `import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from ledger import LedgerClient
from ledger.integrations.fastapi import LedgerMiddleware

ledger = LedgerClient(
    api_key=os.getenv("LEDGER_API_KEY"),
    base_url=os.getenv("LEDGER_BASE_URL"),
    service_name="my-service",
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await ledger.shutdown()

app = FastAPI(lifespan=lifespan)
app.add_middleware(LedgerMiddleware, ledger_client=ledger)`,
      },
      {
        title: 'Add the middleware — Django',
        description: 'Add the client to settings.py and register the middleware.',
        code: `# settings.py
import os

from ledger import LedgerClient

LEDGER_CLIENT = LedgerClient(
    api_key=os.getenv("LEDGER_API_KEY"),
    base_url=os.getenv("LEDGER_BASE_URL"),
)

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "ledger.integrations.django.LedgerMiddleware",
]`,
      },
      {
        title: 'Add the middleware — Flask',
        description: 'Attach the client to the app config and wrap it.',
        code: `import os

from flask import Flask
from ledger import LedgerClient
from ledger.integrations.flask import LedgerMiddleware

app = Flask(__name__)
ledger = LedgerClient(
    api_key=os.getenv("LEDGER_API_KEY"),
    base_url=os.getenv("LEDGER_BASE_URL"),
)
app.config["LEDGER_CLIENT"] = ledger
LedgerMiddleware(app)`,
      },
      {
        title: 'Send manual logs',
        description: 'Attach any attributes you want to filter on later.',
        code: `ledger.log_info("User logged in", attributes={"user_id": 123})
ledger.log_warning("Slow query", attributes={"duration_ms": 450})
ledger.log_error("Payment failed", attributes={"error_code": "CARD_DECLINED"})

try:
    result = process_payment()
except Exception as e:
    ledger.log_exception(e, message="Payment processing failed")`,
      },
      {
        title: 'Forward standard library logging',
        description: 'Optional. Routes every logging.getLogger(...) call — yours and third-party libraries — to Ledger.',
        code: `ledger.instrument_logging()

import logging

logging.getLogger(__name__).warning("this reaches Ledger too")`,
      },
      {
        title: 'Skip noisy paths',
        description: 'Health checks and probes do not need to be logged. By default only requests matching a registered route are logged, so 404 scanner noise is dropped already.',
        code: `app.add_middleware(
    LedgerMiddleware,
    ledger_client=ledger,
    exclude_paths=["/health", "/metrics"],
)`,
      },
      {
        title: 'Open the dashboard',
        description: 'Start your app, hit an endpoint, then open Explore. Logs appear within seconds.',
      },
    ],
  },
  {
    key: 'metrics',
    title: 'Metrics',
    icon: 'mdi-chart-line',
    summary: 'Emit counters, gauges and histograms from your application and chart them on custom dashboard panels.',
    steps: [
      {
        title: 'Start from a configured client',
        description: 'Metrics ride on the same LedgerClient you created in the basic setup — no extra install needed.',
        code: `import os

from ledger import LedgerClient

ledger = LedgerClient(
    api_key=os.getenv("LEDGER_API_KEY"),
    base_url=os.getenv("LEDGER_BASE_URL"),
    service_name="my-service",
)`,
      },
      {
        title: 'Tune the export interval',
        description: 'Metric points are batched and exported periodically. 60 seconds is the default.',
        code: `ledger = LedgerClient(
    api_key=os.getenv("LEDGER_API_KEY"),
    metrics_export_interval=60.0,
)`,
      },
      {
        title: 'Increment a counter',
        description: 'Counters are monotonic — use them for events like orders, signups or cache misses.',
        code: `ledger.metric_increment("orders_processed", tags={"region": "eu"})`,
      },
      {
        title: 'Record a gauge',
        description: 'Gauges hold a point-in-time value, such as queue depth or connection pool usage.',
        code: `ledger.metric_gauge("queue_depth", 42)`,
      },
      {
        title: 'Record a histogram',
        description: 'Histograms capture distributions — latency, payload sizes, batch counts.',
        code: `ledger.metric_histogram(
    "request_duration_ms",
    123.4,
    tags={"route": "/api/orders"},
)`,
      },
      {
        title: 'Use the raw OpenTelemetry Meter API',
        description: 'For full control (custom instrument types, observable callbacks) grab a standard OTel Meter.',
        code: `meter = ledger.get_meter("my-service")
counter = meter.create_counter("requests")
counter.add(1, {"route": "/health"})`,
      },
      {
        title: 'Chart it',
        description: 'Open Panel, add a metric panel, and pick your metric name. Series are grouped by the tags you sent.',
      },
    ],
  },
  {
    key: 'tracing',
    title: 'Tracing',
    icon: 'mdi-vector-polyline',
    summary: 'Follow a request end to end across services with W3C-compatible distributed traces.',
    steps: [
      {
        title: 'Tracing is already on',
        description: 'Creating a LedgerClient registers a real OpenTelemetry TracerProvider as the process-global provider. Traces show up in the Traces panel.',
        code: `from ledger import LedgerClient, get_tracer

ledger = LedgerClient(
    api_key=os.getenv("LEDGER_API_KEY"),
    base_url=os.getenv("LEDGER_BASE_URL"),
    service_name="my-service",
)
tracer = get_tracer(__name__)`,
      },
      {
        title: 'Set the sample rate',
        description: 'Sampling defaults to 0.1 (10% of traces). Raise it in development, keep it low in high-traffic production.',
        code: `ledger = LedgerClient(
    api_key=os.getenv("LEDGER_API_KEY"),
    trace_sample_rate=1.0,
)`,
      },
      {
        title: 'Create manual spans',
        description: 'Wrap any unit of work you want timed. Attributes are searchable.',
        code: `with tracer.start_as_current_span(
    "process-order",
    attributes={"order_id": 42},
) as span:
    result = process_order(42)
    span.set_attribute("status", result.status)`,
      },
      {
        title: 'Nest spans inside request handlers',
        description: 'With LedgerMiddleware every request is already a root span — child spans nest under it automatically.',
        code: `@app.get("/orders/{id}")
async def get_order(id: int):
    tracer = get_tracer(__name__)

    with tracer.start_as_current_span("db-fetch", attributes={"order_id": id}):
        return await db.get_order(id)`,
      },
      {
        title: 'Propagate across services automatically',
        description: 'One call instruments every requests/httpx outbound call with traceparent headers.',
        code: `import ledger.integrations.requests as ledger_requests

ledger_requests.install()`,
      },
      {
        title: 'Or propagate manually',
        description: 'Inject the context into outgoing headers when you control the call site.',
        code: `import opentelemetry.propagate as propagate

with tracer.start_as_current_span("outgoing-call"):
    headers = {}
    propagate.inject(headers)
    response = httpx.get("https://downstream/api", headers=headers)`,
      },
      {
        title: 'Extract context downstream',
        description: 'The receiving service continues the same trace instead of starting a new one.',
        code: `import opentelemetry.propagate as propagate

ctx = propagate.extract(request.headers)

with tracer.start_as_current_span("downstream-handler", context=ctx):
    ...`,
      },
      {
        title: 'Correlate logs with traces',
        description: 'Any log emitted inside an active span automatically carries trace_id and span_id, so the dashboard links them both ways. Nothing to configure.',
      },
    ],
  },
  {
    key: 'opentelemetry',
    title: 'OpenTelemetry',
    icon: 'mdi-language-go',
    summary: 'Not using Python? Point any language\'s stock OpenTelemetry SDK at Ledger — no Ledger-specific package required.',
    steps: [
      {
        title: 'Grab an API key',
        description: 'Create a project in the dashboard and generate an API key. It becomes your OTLP bearer token.',
      },
      {
        title: 'Set the standard OTLP environment variables',
        description: 'Every OpenTelemetry SDK honours these — no code changes needed.',
        code: `export OTEL_EXPORTER_OTLP_ENDPOINT="${SERVER_URL}"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer ledger_proj_1_your_api_key"
export OTEL_SERVICE_NAME="my-service"`,
        label: 'bash',
        icon: 'mdi-console',
      },
      {
        title: 'Node.js',
        description: 'Use the standard OTLP HTTP exporters — the endpoint above is picked up from the environment.',
        code: `npm install @opentelemetry/sdk-node \\
  @opentelemetry/exporter-trace-otlp-proto \\
  @opentelemetry/auto-instrumentations-node`,
        label: 'bash',
        icon: 'mdi-console',
      },
      {
        title: 'Node.js — bootstrap',
        description: 'Load this file before your app entrypoint.',
        code: `const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto')
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()`,
        label: 'javascript',
        icon: 'mdi-language-javascript',
      },
      {
        title: 'Go',
        description: 'Standard otlptracehttp exporter, configured from the environment.',
        code: `go get go.opentelemetry.io/otel \\
  go.opentelemetry.io/otel/sdk \\
  go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp`,
        label: 'bash',
        icon: 'mdi-console',
      },
      {
        title: 'Java',
        description: 'Attach the auto-instrumentation agent — zero code changes.',
        code: `java -javaagent:opentelemetry-javaagent.jar -jar my-app.jar`,
        label: 'bash',
        icon: 'mdi-console',
      },
      {
        title: 'Or post OTLP directly',
        description: 'Traces go to /v1/traces, logs to /v1/logs, metrics to /v1/metrics. All accept application/x-protobuf or application/json, gzip optional.',
        code: `curl -X POST ${SERVER_URL}/v1/logs \\
  -H "Authorization: Bearer ledger_proj_1_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "resourceLogs": [{
      "resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "my-app"}}]},
      "scopeLogs": [{
        "logRecords": [{
          "severityNumber": 9,
          "body": {"stringValue": "Hello from Ledger!"},
          "attributes": [{"key": "user_id", "value": {"stringValue": "123"}}]
        }]
      }]
    }]
  }'`,
        label: 'bash',
        icon: 'mdi-console',
      },
      {
        title: 'Verify ingestion',
        description: 'Open Explore and filter by your service name. Data appears within seconds of the first export flush.',
      },
    ],
  },
]
