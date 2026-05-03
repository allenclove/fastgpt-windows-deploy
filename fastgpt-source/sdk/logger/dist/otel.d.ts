import { type Sink } from '@logtape/logtape';
import { type AnyValue, type LoggerProvider as LoggerProviderBase } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import type { Resource } from '@opentelemetry/resources';
/**
 * Checks if an OTLP endpoint is configured via environment variables or options.
 * Checks the following environment variables:
 * - `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` (logs-specific endpoint)
 * - `OTEL_EXPORTER_OTLP_ENDPOINT` (general OTLP endpoint)
 *
 * @param config Optional exporter configuration that may contain a URL.
 * @returns `true` if an endpoint is configured, `false` otherwise.
 */
type OtlpHttpExporterConfig = ConstructorParameters<typeof OTLPLogExporter>[0];
/**
 * The OpenTelemetry logger provider.
 */
type ILoggerProvider = LoggerProviderBase & {
    /**
     * Flush all buffered data and shut down the LoggerProvider and all registered
     * LogRecordProcessor.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    shutdown?: () => Promise<void>;
};
/**
 * The way to render the object in the log record.  If `"json"`,
 * the object is rendered as a JSON string.  If `"inspect"`,
 * the object is rendered using `util.inspect` in Node.js.
 */
export type ObjectRenderer = 'json' | 'inspect';
type Message = (string | null | undefined)[];
/**
 * Custom `body` attribute formatter.
 */
export type BodyFormatter = (message: Message) => AnyValue;
/**
 * How to serialize `Error` objects in log attributes.
 */
export type ExceptionAttributeMode = 'semconv' | 'raw' | false;
/**
 * Base options shared by all OpenTelemetry sink configurations.
 */
interface OpenTelemetrySinkOptionsBase {
    /**
     * The way to render the message in the log record.  If `"string"`,
     * the message is rendered as a single string with the values are
     * interpolated into the message.  If `"array"`, the message is
     * rendered as an array of strings.  `"string"` by default.
     *
     * Or even fully customizable with a {@link BodyFormatter} function.
     */
    messageType?: 'string' | 'array' | BodyFormatter;
    /**
     * The way to render the object in the log record.  If `"json"`,
     * the object is rendered as a JSON string.  If `"inspect"`,
     * the object is rendered using `util.inspect` in Node.js.
     * `"inspect"` by default.
     */
    objectRenderer?: ObjectRenderer;
    /**
     * How to serialize `Error` objects in log attributes.
     *
     * - `"semconv"` (default): Follow OpenTelemetry semantic conventions,
     *   converting `Error` objects to `exception.type`, `exception.message`,
     *   and `exception.stacktrace` attributes.
     * - `"raw"`: Serialize `Error` objects as JSON strings with fields like
     *   `name`, `message`, `stack`, etc.
     * - `false`: Treat `Error` objects like regular objects without special
     *   handling.
     */
    exceptionAttributes?: ExceptionAttributeMode;
    /**
     * Whether to log diagnostics.  Diagnostic logs are logged to
     * the `["logtape", "meta", "otel"]` category.
     * Turned off by default.
     */
    diagnostics?: boolean;
    /**
     * The logger name passed to the OpenTelemetry provider.
     * Defaults to the service name when omitted.
     */
    loggerName?: string;
}
/**
 * Options for creating an OpenTelemetry sink with a custom logger provider.
 * When using this configuration, you are responsible for setting up the
 * logger provider with appropriate exporters and processors.
 */
export interface OpenTelemetrySinkProviderOptions extends OpenTelemetrySinkOptionsBase {
    /**
     * The OpenTelemetry logger provider to use.
     */
    loggerProvider: ILoggerProvider;
}
/**
 * Options for creating an OpenTelemetry sink with automatic exporter creation.
 */
export interface OpenTelemetrySinkExporterOptions extends OpenTelemetrySinkOptionsBase {
    /**
     * The OpenTelemetry logger provider to use.
     * Must be undefined or omitted when using exporter options.
     */
    loggerProvider?: undefined;
    /**
     * The OpenTelemetry OTLP exporter configuration to use.
     */
    otlpExporterConfig?: OtlpHttpExporterConfig;
    /**
     * The service name to use.  If not provided, the service name is
     * taken from the `OTEL_SERVICE_NAME` environment variable.
     */
    serviceName?: string;
    /**
     * An additional resource to merge with the default resource.
     */
    additionalResource?: Resource;
}
/**
 * Options for creating an OpenTelemetry sink.
 *
 * This is a union type that accepts either:
 * - {@link OpenTelemetrySinkProviderOptions}: Provide your own `loggerProvider`
 *   (recommended for production)
 * - {@link OpenTelemetrySinkExporterOptions}: Let the sink create an exporter
 *   automatically based on environment variables
 */
export type OpenTelemetrySinkOptions = OpenTelemetrySinkProviderOptions | OpenTelemetrySinkExporterOptions;
/**
 * An OpenTelemetry sink with async disposal and initialization tracking.
 */
export interface OpenTelemetrySink extends Sink, AsyncDisposable {
    /**
     * A promise that resolves when the sink's lazy initialization completes.
     * For sinks created with an explicit `loggerProvider`, this resolves
     * immediately.  For sinks using automatic exporter creation, this resolves
     * once the OpenTelemetry logger provider is fully initialized.
     */
    readonly ready: Promise<void>;
}
/**
 * Creates a sink that forwards log records to OpenTelemetry.
 *
 * When a custom `loggerProvider` is provided, it is used directly.
 * Otherwise, the sink will lazily initialize a logger provider on the first
 * log record, using OTLP over HTTP/JSON.
 *
 * @param options Options for creating the sink.
 * @returns The sink.
 */
export declare function getOpenTelemetrySink(options?: OpenTelemetrySinkOptions): OpenTelemetrySink;
export {};
//# sourceMappingURL=otel.d.ts.map