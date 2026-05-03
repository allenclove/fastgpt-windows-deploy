import { getConsoleSink, withFilter } from '@logtape/logtape';
import { getPrettyFormatter } from '@logtape/pretty';
import { mapLevelToSeverityNumber } from './helpers';
import { getOpenTelemetrySink } from './otel';
const defaultConsoleOptions = {
    enabled: true,
    level: 'trace'
};
const defaultOtelOptions = {
    enabled: false,
    level: 'info'
};
function normalizeConsoleOptions(options) {
    if (typeof options === 'boolean') {
        return {
            ...defaultConsoleOptions,
            enabled: options
        };
    }
    return {
        enabled: options?.enabled ?? defaultConsoleOptions.enabled,
        level: options?.level ?? defaultConsoleOptions.level
    };
}
function normalizeOtelOptions(options) {
    if (!options) {
        return {
            ...defaultOtelOptions,
            serviceName: undefined,
            url: undefined,
            loggerName: undefined
        };
    }
    return {
        enabled: options.enabled ?? true,
        level: options.level ?? defaultOtelOptions.level,
        serviceName: options.serviceName,
        url: options.url,
        loggerName: options.loggerName ?? options.serviceName
    };
}
function pad(value) {
    return value.toString().padStart(2, '0');
}
function formatTimestamp(timestamp) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export async function createSinks(options) {
    const consoleOptions = normalizeConsoleOptions(options.console);
    const otelOptions = normalizeOtelOptions(options.otel);
    const sensitiveProperties = options.sensitiveProperties ?? [];
    const sinkConfig = {
        bufferSize: 8192,
        flushInterval: 5000,
        nonBlocking: true,
        lazy: true
    };
    const sinks = {};
    const composedSinks = [];
    const levelFilter = (record, level) => {
        return mapLevelToSeverityNumber(record.level) >= mapLevelToSeverityNumber(level);
    };
    if (consoleOptions.enabled) {
        sinks.console = withFilter(getConsoleSink({
            ...sinkConfig,
            formatter: getPrettyFormatter({
                icons: false,
                level: 'ABBR',
                wordWrap: false,
                messageColor: null,
                categoryColor: null,
                timestampColor: null,
                levelStyle: 'reset',
                messageStyle: 'reset',
                categoryStyle: 'reset',
                timestampStyle: 'reset',
                categorySeparator: ':',
                timestamp: formatTimestamp,
                inspectOptions: { depth: 5 }
            })
        }), (record) => levelFilter(record, consoleOptions.level));
        composedSinks.push('console');
    }
    if (otelOptions.enabled) {
        if (!otelOptions.serviceName) {
            throw new Error('`otel.serviceName` is required when OpenTelemetry logging is enabled');
        }
        sinks.otel = withFilter(getOpenTelemetrySink({
            serviceName: otelOptions.serviceName,
            loggerName: otelOptions.loggerName,
            otlpExporterConfig: otelOptions.url ? { url: otelOptions.url } : undefined
        }), (record) => {
            const properties = record.properties ?? {};
            return (levelFilter(record, otelOptions.level) &&
                !sensitiveProperties.some((property) => property in properties));
        });
        composedSinks.push('otel');
    }
    return { sinks, composedSinks };
}
//# sourceMappingURL=sinks.js.map