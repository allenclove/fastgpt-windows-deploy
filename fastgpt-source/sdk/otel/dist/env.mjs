import { configureLoggerFromEnv, createLoggerOptionsFromEnv } from './logger';
import { configureMetricsFromEnv, createMetricsOptionsFromEnv } from './metrics';
import { configureTracingFromEnv, createTracingOptionsFromEnv } from './tracing';
export function createOtelOptionsFromEnv(options = {}) {
    const env = options.env ?? process.env;
    return {
        logger: createLoggerOptionsFromEnv({
            env,
            defaultServiceName: options.defaultServiceName,
            ...options.logger
        }),
        metrics: createMetricsOptionsFromEnv({
            env,
            defaultServiceName: options.defaultServiceName,
            ...options.metrics
        }),
        tracing: createTracingOptionsFromEnv({
            env,
            defaultServiceName: options.defaultServiceName,
            ...options.tracing
        })
    };
}
export async function configureOtelFromEnv(options = {}) {
    const env = options.env ?? process.env;
    await Promise.all([
        configureLoggerFromEnv({
            env,
            defaultServiceName: options.defaultServiceName,
            ...options.logger
        }),
        configureMetricsFromEnv({
            env,
            defaultServiceName: options.defaultServiceName,
            ...options.metrics
        }),
        configureTracingFromEnv({
            env,
            defaultServiceName: options.defaultServiceName,
            ...options.tracing
        })
    ]);
}
//# sourceMappingURL=env.js.map