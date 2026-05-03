import { configureTracing } from './client';
import { parseBooleanEnv, parseNumberEnv, parseStringEnv } from '../env-utils';
function normalizeSampleRatio(value, defaultValue) {
    if (!Number.isFinite(value))
        return defaultValue;
    return Math.max(0, Math.min(1, value));
}
function getSampleRatioFromStandardEnv(env, defaultValue) {
    const sampler = parseStringEnv(env.OTEL_TRACES_SAMPLER)?.toLowerCase();
    const samplerArg = normalizeSampleRatio(parseNumberEnv(env.OTEL_TRACES_SAMPLER_ARG, defaultValue), defaultValue);
    if (sampler === 'always_off' || sampler === 'parentbased_always_off')
        return 0;
    if (sampler === 'always_on' || sampler === 'parentbased_always_on')
        return 1;
    if (sampler === 'traceidratio' || sampler === 'parentbased_traceidratio') {
        return samplerArg;
    }
    return defaultValue;
}
export function createTracingOptionsFromEnv(options = {}) {
    const env = options.env ?? process.env;
    const tracesExporter = parseStringEnv(env.OTEL_TRACES_EXPORTER)?.toLowerCase();
    const enabled = parseBooleanEnv(env.TRACING_ENABLE_OTEL, tracesExporter === 'otlp' || options.defaultTracingEnabled === true);
    const defaultSampleRatio = normalizeSampleRatio(options.defaultSampleRatio ?? 1, 1);
    return {
        defaultTracerName: options.defaultTracerName ?? options.defaultServiceName ?? 'fastgpt',
        tracing: enabled
            ? {
                enabled: true,
                serviceName: parseStringEnv(env.TRACING_OTEL_SERVICE_NAME) ??
                    parseStringEnv(env.OTEL_SERVICE_NAME) ??
                    options.defaultServiceName,
                url: parseStringEnv(env.TRACING_OTEL_URL) ??
                    parseStringEnv(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) ??
                    options.defaultTracingUrl,
                sampleRatio: normalizeSampleRatio(parseNumberEnv(env.TRACING_OTEL_SAMPLE_RATIO, NaN), getSampleRatioFromStandardEnv(env, defaultSampleRatio))
            }
            : false
    };
}
export async function configureTracingFromEnv(options = {}) {
    return configureTracing(createTracingOptionsFromEnv(options));
}
//# sourceMappingURL=env.js.map