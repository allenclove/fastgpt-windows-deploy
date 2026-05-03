import { configureMetrics } from './client';
import { parseBooleanEnv, parsePositiveNumberEnv, parseStringEnv } from '../env-utils';
export function createMetricsOptionsFromEnv(options = {}) {
    const env = options.env ?? process.env;
    const metricsExporter = parseStringEnv(env.OTEL_METRICS_EXPORTER)?.toLowerCase();
    const enabled = parseBooleanEnv(env.METRICS_ENABLE_OTEL, metricsExporter === 'otlp' || options.defaultMetricsEnabled === true);
    return {
        defaultMeterName: options.defaultMeterName ?? options.defaultServiceName ?? 'fastgpt',
        metrics: enabled
            ? {
                enabled: true,
                serviceName: parseStringEnv(env.METRICS_OTEL_SERVICE_NAME) ??
                    parseStringEnv(env.OTEL_SERVICE_NAME) ??
                    options.defaultServiceName,
                url: parseStringEnv(env.METRICS_OTEL_URL) ??
                    parseStringEnv(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT) ??
                    options.defaultMetricsUrl,
                exportIntervalMillis: parsePositiveNumberEnv(env.METRICS_EXPORT_INTERVAL ?? env.OTEL_METRIC_EXPORT_INTERVAL, options.defaultExportIntervalMillis ?? 30000)
            }
            : false
    };
}
export async function configureMetricsFromEnv(options = {}) {
    return configureMetrics(createMetricsOptionsFromEnv(options));
}
//# sourceMappingURL=env.js.map