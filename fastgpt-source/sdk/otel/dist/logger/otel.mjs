import { getLogger } from '@logtape/logtape';
import { diag, DiagLogLevel } from '@opentelemetry/api';
import { NOOP_LOGGER } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { inspect as nodeInspect } from 'util';
import { mapLevelToSeverityNumber } from './helpers';
function getEnvironmentVariable(name) {
    return process.env[name];
}
function hasOtlpEndpoint(config) {
    if (config?.url)
        return true;
    const logsEndpoint = getEnvironmentVariable('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT');
    if (logsEndpoint)
        return true;
    const endpoint = getEnvironmentVariable('OTEL_EXPORTER_OTLP_ENDPOINT');
    if (endpoint)
        return true;
    return false;
}
const noopLoggerProvider = {
    getLogger: () => NOOP_LOGGER
};
async function initializeLoggerProvider(options) {
    if (!hasOtlpEndpoint(options.otlpExporterConfig)) {
        return noopLoggerProvider;
    }
    const resource = defaultResource().merge(resourceFromAttributes({
        [ATTR_SERVICE_NAME]: options.serviceName ?? getEnvironmentVariable('OTEL_SERVICE_NAME')
    }).merge(options.additionalResource ?? null));
    const otlpExporter = new OTLPLogExporter(options.otlpExporterConfig);
    const loggerProvider = new LoggerProvider({
        resource,
        processors: [new BatchLogRecordProcessor(otlpExporter)]
    });
    return loggerProvider;
}
function emitLogRecord(logger, record, options) {
    const objectRenderer = options.objectRenderer ?? 'inspect';
    const exceptionMode = options.exceptionAttributes ?? 'semconv';
    const { category, level, message, timestamp, properties } = record;
    const severityNumber = mapLevelToSeverityNumber(level);
    const attributes = convertToAttributes(properties ?? {}, objectRenderer, exceptionMode);
    attributes['category'] = [...category];
    logger.emit({
        severityNumber,
        severityText: level,
        body: typeof options.messageType === 'function'
            ? convertMessageToCustomBodyFormat(message, objectRenderer, exceptionMode, options.messageType)
            : options.messageType === 'array'
                ? convertMessageToArray(message, objectRenderer, exceptionMode)
                : convertMessageToString(message, objectRenderer, exceptionMode),
        attributes,
        timestamp: new Date(timestamp)
    });
}
function getOpenTelemetryLoggerName(options) {
    const serviceName = 'serviceName' in options ? options.serviceName : undefined;
    return options.loggerName ?? serviceName ?? 'app';
}
export function getOpenTelemetrySink(options = {}) {
    if (options.diagnostics) {
        diag.setLogger(new DiagLoggerAdaptor(), DiagLogLevel.DEBUG);
    }
    if (options.loggerProvider != null) {
        const loggerProvider = options.loggerProvider;
        const logger = loggerProvider.getLogger(getOpenTelemetryLoggerName(options));
        const shutdown = loggerProvider.shutdown?.bind(loggerProvider);
        const sink = Object.assign((record) => {
            const { category } = record;
            if (category[0] === 'logtape' && category[1] === 'meta' && category[2] === 'otel') {
                return;
            }
            emitLogRecord(logger, record, options);
        }, {
            ready: Promise.resolve(),
            async [Symbol.asyncDispose]() {
                if (shutdown != null)
                    await shutdown();
            }
        });
        return sink;
    }
    let loggerProvider = null;
    let logger = null;
    let initPromise = null;
    let initError = null;
    let pendingRecords = [];
    const sink = Object.assign((record) => {
        const { category } = record;
        if (category[0] === 'logtape' && category[1] === 'meta' && category[2] === 'otel') {
            return;
        }
        if (logger != null) {
            emitLogRecord(logger, record, options);
            return;
        }
        if (initError != null) {
            return;
        }
        pendingRecords.push(record);
        if (initPromise == null) {
            initPromise = initializeLoggerProvider(options)
                .then((provider) => {
                loggerProvider = provider;
                logger = provider.getLogger(getOpenTelemetryLoggerName(options));
                for (const pendingRecord of pendingRecords) {
                    emitLogRecord(logger, pendingRecord, options);
                }
                pendingRecords = [];
            })
                .catch((error) => {
                initError = error;
                pendingRecords = [];
                // eslint-disable-next-line no-console
                console.error('Failed to initialize OpenTelemetry logger:', error);
            });
        }
    }, {
        get ready() {
            return initPromise ?? Promise.resolve();
        },
        async [Symbol.asyncDispose]() {
            if (initPromise != null) {
                try {
                    await initPromise;
                }
                catch {
                    return;
                }
            }
            if (loggerProvider?.shutdown != null) {
                await loggerProvider.shutdown();
            }
        }
    });
    return sink;
}
function convertValueToAnyValue(value, objectRenderer, exceptionMode) {
    if (value == null)
        return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        let primitiveType = null;
        let isHomogeneous = true;
        for (const item of value) {
            if (item == null)
                continue;
            const itemType = typeof item;
            if (itemType !== 'string' && itemType !== 'number' && itemType !== 'boolean') {
                isHomogeneous = false;
                break;
            }
            if (primitiveType === null) {
                primitiveType = itemType;
            }
            else if (primitiveType !== itemType) {
                isHomogeneous = false;
                break;
            }
        }
        if (isHomogeneous && primitiveType !== null) {
            return value;
        }
        const converted = [];
        for (const item of value) {
            const convertedItem = convertValueToAnyValue(item, objectRenderer, exceptionMode);
            if (convertedItem !== null) {
                converted.push(convertedItem);
            }
        }
        return converted;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (value instanceof Error) {
        const errorObj = serializeValue(value);
        const converted = {};
        for (const [key, val] of Object.entries(errorObj)) {
            const convertedVal = convertValueToAnyValue(val, objectRenderer, exceptionMode);
            if (convertedVal !== null) {
                converted[key] = convertedVal;
            }
        }
        return converted;
    }
    if (typeof value === 'object') {
        const proto = Object.getPrototypeOf(value);
        const isPlainObject = proto === Object.prototype || proto === null;
        if (isPlainObject) {
            const converted = {};
            for (const [key, val] of Object.entries(value)) {
                const convertedVal = convertValueToAnyValue(val, objectRenderer, exceptionMode);
                if (convertedVal !== null) {
                    converted[key] = convertedVal;
                }
            }
            return converted;
        }
        if (objectRenderer === 'inspect') {
            return nodeInspect(value);
        }
        return JSON.stringify(value);
    }
    return String(value);
}
function convertToAttributes(properties, objectRenderer, exceptionMode) {
    const attributes = {};
    for (const [name, value] of Object.entries(properties)) {
        if (value == null)
            continue;
        if (value instanceof Error && exceptionMode === 'semconv') {
            attributes['exception.type'] = value.name;
            attributes['exception.message'] = value.message;
            if (typeof value.stack === 'string') {
                attributes['exception.stacktrace'] = value.stack;
            }
            continue;
        }
        const convertedValue = convertValueToAnyValue(value, objectRenderer, exceptionMode);
        if (convertedValue !== null) {
            attributes[name] = convertedValue;
        }
    }
    return attributes;
}
function serializeValue(value) {
    if (value instanceof Error) {
        const serialized = {
            name: value.name,
            message: value.message
        };
        if (typeof value.stack === 'string') {
            serialized.stack = value.stack;
        }
        const cause = value.cause;
        if (cause !== undefined) {
            serialized.cause = serializeValue(cause);
        }
        if (typeof AggregateError !== 'undefined' && value instanceof AggregateError) {
            serialized.errors = value.errors.map(serializeValue);
        }
        for (const key of Object.keys(value)) {
            if (!(key in serialized)) {
                serialized[key] = serializeValue(value[key]);
            }
        }
        return serialized;
    }
    if (Array.isArray(value)) {
        return value.map(serializeValue);
    }
    if (value !== null && typeof value === 'object') {
        const serialized = {};
        for (const [key, val] of Object.entries(value)) {
            serialized[key] = serializeValue(val);
        }
        return serialized;
    }
    return value;
}
function convertToString(value, objectRenderer, exceptionMode) {
    if (value === null || value === undefined || typeof value === 'string') {
        return value;
    }
    if (objectRenderer === 'inspect')
        return nodeInspect(value);
    if (typeof value === 'number' || typeof value === 'boolean') {
        return value.toString();
    }
    if (value instanceof Date)
        return value.toISOString();
    if (value instanceof Error && (exceptionMode === 'raw' || exceptionMode === 'semconv')) {
        return JSON.stringify(serializeValue(value));
    }
    return JSON.stringify(value);
}
function convertMessageToArray(message, objectRenderer, exceptionMode) {
    const body = [];
    for (let i = 0; i < message.length; i += 2) {
        const msg = message[i];
        body.push(msg);
        if (message.length <= i + 1)
            break;
        const val = message[i + 1];
        body.push(convertToString(val, objectRenderer, exceptionMode));
    }
    return body;
}
function convertMessageToString(message, objectRenderer, exceptionMode) {
    let body = '';
    for (let i = 0; i < message.length; i += 2) {
        const msg = message[i];
        body += msg;
        if (message.length <= i + 1)
            break;
        const val = message[i + 1];
        const extra = convertToString(val, objectRenderer, exceptionMode);
        body += extra ?? JSON.stringify(extra);
    }
    return body;
}
function convertMessageToCustomBodyFormat(message, objectRenderer, exceptionMode, bodyFormatter) {
    const body = message.map((msg) => convertToString(msg, objectRenderer, exceptionMode));
    return bodyFormatter(body);
}
class DiagLoggerAdaptor {
    logger;
    constructor() {
        this.logger = getLogger(['logtape', 'meta', 'otel']);
    }
    #escape(msg) {
        return msg.replaceAll('{', '{{').replaceAll('}', '}}');
    }
    error(msg, ...values) {
        this.logger.error(`${this.#escape(msg)}: {values}`, { values });
    }
    warn(msg, ...values) {
        this.logger.warn(`${this.#escape(msg)}: {values}`, { values });
    }
    info(msg, ...values) {
        this.logger.info(`${this.#escape(msg)}: {values}`, { values });
    }
    debug(msg, ...values) {
        this.logger.debug(`${this.#escape(msg)}: {values}`, { values });
    }
    verbose(msg, ...values) {
        this.logger.debug(`${this.#escape(msg)}: {values}`, { values });
    }
}
//# sourceMappingURL=otel.js.map