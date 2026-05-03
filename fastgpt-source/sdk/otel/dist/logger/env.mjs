import { configureLogger } from './client';
import { parseBooleanEnv, parseStringEnv } from '../env-utils';
const logLevels = new Set(['trace', 'debug', 'info', 'warning', 'error', 'fatal']);
function parseLogLevel(value, defaultValue) {
    if (typeof value !== 'string')
        return defaultValue;
    return logLevels.has(value) ? value : defaultValue;
}
export function createLoggerOptionsFromEnv(options = {}) {
    const env = options.env ?? process.env;
    const defaultServiceName = options.defaultServiceName ?? 'app';
    const serviceName = parseStringEnv(env.LOG_OTEL_SERVICE_NAME) ?? defaultServiceName;
    const loggerName = parseStringEnv(env.LOG_OTEL_LOGGER_NAME) ?? options.defaultLoggerName ?? serviceName;
    return {
        defaultCategory: options.defaultCategory,
        console: {
            enabled: parseBooleanEnv(env.LOG_ENABLE_CONSOLE, options.defaultConsoleEnabled ?? true),
            level: parseLogLevel(env.LOG_CONSOLE_LEVEL, options.defaultConsoleLevel ?? 'trace')
        },
        otel: parseBooleanEnv(env.LOG_ENABLE_OTEL, options.defaultOtelEnabled ?? false)
            ? {
                serviceName,
                loggerName,
                url: parseStringEnv(env.LOG_OTEL_URL) ??
                    options.defaultOtelUrl ??
                    'http://localhost:4318/v1/logs',
                level: parseLogLevel(env.LOG_OTEL_LEVEL, options.defaultOtelLevel ?? 'warning')
            }
            : false,
        sensitiveProperties: options.sensitiveProperties
    };
}
export async function configureLoggerFromEnv(options = {}) {
    return configureLogger(createLoggerOptionsFromEnv(options));
}
//# sourceMappingURL=env.js.map