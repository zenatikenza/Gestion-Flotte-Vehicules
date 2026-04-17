import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');

const prometheusExporter = new PrometheusExporter({ port: 9464 });

const sdk = new NodeSDK({
  serviceName: 'conductor-service',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
  }),
  metricReader: prometheusExporter,
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || 'http://jaeger:4318/v1/logs',
    }),
  ),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log('[OpenTelemetry] SDK initialisé pour conductor-service (traces + metrics :9464 + logs)');

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
