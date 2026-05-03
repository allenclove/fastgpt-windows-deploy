import { metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
let configured = false;
let configurePromise = null;
let meterProvider = null;
let defaultMeterName = 'fastgpt';
let defaultMeterVersion;
function getEnvironmentVariable(name) {
    return process.env[name];
}
function hasOtlpEndpoint(config) {
    if (config?.url)
        return true;
    if (getEnvironmentVariable('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'))
        return true;
    if (getEnvironmentVariable('OTEL_EXPORTER_OTLP_ENDPOINT'))
        return true;
    return false;
}
function normalizeOtlpMetricsUrl(url) {
    const trimmed = url.trim();
    if (!trimmed)
        return trimmed;
    if (trimmed.endsWith('/v1/metrics'))
        return trimmed;
    return `${trimmed.replace(/\/+$/, '')}/v1/metrics`;
}
function resolveOtlpMetricsUrl(config) {
    if (config?.url)
        return config.url;
    const metricsEndpoint = getEnvironmentVariable('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT');
    if (metricsEndpoint)
        return metricsEndpoint;
    const endpoint = getEnvironmentVariable('OTEL_EXPORTER_OTLP_ENDPOINT');
    if (endpoint)
        return normalizeOtlpMetricsUrl(endpoint);
    return undefined;
}
function normalizeMetricsOptions(options) {
    if (options === false) {
        return {
            enabled: false,
            exportIntervalMillis: 30000
        };
    }
    return {
        enabled: options?.enabled ?? false,
        serviceName: options?.serviceName,
        exportIntervalMillis: options?.exportIntervalMillis ?? 30000,
        otlpExporterConfig: {
            url: options?.url,
            headers: options?.headers
        },
        additionalResource: options?.additionalResource ?? null
    };
}
export async function configureMetrics(options = {}) {
    if (configured)
        return;
    if (configurePromise)
        return configurePromise;
    configurePromise = (async () => {
        const metricsOptions = normalizeMetricsOptions(options.metrics);
        defaultMeterName = options.defaultMeterName ?? defaultMeterName;
        defaultMeterVersion = options.defaultMeterVersion ?? defaultMeterVersion;
        const resource = defaultResource().merge(resourceFromAttributes({
            [ATTR_SERVICE_NAME]: metricsOptions.serviceName ??
                getEnvironmentVariable('OTEL_SERVICE_NAME') ??
                defaultMeterName
        }).merge(metricsOptions.additionalResource ?? null));
        const readers = [];
        if (metricsOptions.enabled && hasOtlpEndpoint(metricsOptions.otlpExporterConfig)) {
            const exporter = new OTLPMetricExporter({
                ...metricsOptions.otlpExporterConfig,
                url: resolveOtlpMetricsUrl(metricsOptions.otlpExporterConfig)
            });
            readers.push(new PeriodicExportingMetricReader({
                exporter,
                exportIntervalMillis: metricsOptions.exportIntervalMillis
            }));
        }
        meterProvider = new MeterProvider({
            resource,
            readers
        });
        metrics.setGlobalMeterProvider(meterProvider);
        configured = true;
    })();
    try {
        await configurePromise;
    }
    catch (error) {
        configurePromise = null;
        throw error;
    }
}
export async function disposeMetrics() {
    if (configurePromise) {
        try {
            await configurePromise;
        }
        catch {
            configurePromise = null;
            return;
        }
    }
    if (!configured || !meterProvider)
        return;
    await meterProvider.shutdown();
    configured = false;
    configurePromise = null;
    meterProvider = null;
}
export function getMeter(name = defaultMeterName, version = defaultMeterVersion) {
    return metrics.getMeter(name, version);
}
//# sourceMappingURL=client.js.map