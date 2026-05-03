import { configureLogger } from './client';
const logLevels = new Set(['trace', 'debug', 'info', 'warning', 'error', 'fatal']);
function parseBoolean(value, defaultValue) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value !== 'string' || !value)
        return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized))
        return true;
    if (['0', 'false', 'no', 'off'].includes(normalized))
        return false;
    return defaultValue;
}
function parseLogLevel(value, defaultValue) {
    if (typeof value !== 'string')
        return defaultValue;
    return logLevels.has(value) ? value : defaultValue;
}
function parseString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
export function createLoggerOptionsFromEnv(options = {}) {
    const env = options.env ?? process.env;
    const defaultServiceName = options.defaultServiceName ?? 'app';
    const serviceName = parseString(env.LOG_OTEL_SERVICE_NAME) ?? defaultServiceName;
    const loggerName = parseString(env.LOG_OTEL_LOGGER_NAME) ?? options.defaultLoggerName ?? serviceName;
    return {
        defaultCategory: options.defaultCategory,
        console: {
            enabled: parseBoolean(env.LOG_ENABLE_CONSOLE, options.defaultConsoleEnabled ?? true),
            level: parseLogLevel(env.LOG_CONSOLE_LEVEL, options.defaultConsoleLevel ?? 'trace')
        },
        otel: parseBoolean(env.LOG_ENABLE_OTEL, options.defaultOtelEnabled ?? false)
            ? {
                serviceName,
                loggerName,
                url: parseString(env.LOG_OTEL_URL) ??
                    options.defaultOtelUrl ??
                    'http://localhost:4318/v1/logs',
                level: parseLogLevel(env.LOG_OTEL_LEVEL, options.defaultOtelLevel ?? 'info')
            }
            : false,
        sensitiveProperties: options.sensitiveProperties
    };
}
export async function configureLoggerFromEnv(options = {}) {
    return configureLogger(createLoggerOptionsFromEnv(options));
}
//# sourceMappingURL=env.js.map