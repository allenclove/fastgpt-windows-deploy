import { type Sink } from '@logtape/logtape';
import { type AnyValue, type LoggerProvider as LoggerProviderBase } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import type { Resource } from '@opentelemetry/resources';
type OtlpHttpExporterConfig = ConstructorParameters<typeof OTLPLogExporter>[0];
type ILoggerProvider = LoggerProviderBase & {
    shutdown?: () => Promise<void>;
};
export type ObjectRenderer = 'json' | 'inspect';
type Message = (string | null | undefined)[];
export type BodyFormatter = (message: Message) => AnyValue;
export type ExceptionAttributeMode = 'semconv' | 'raw' | false;
interface OpenTelemetrySinkOptionsBase {
    messageType?: 'string' | 'array' | BodyFormatter;
    objectRenderer?: ObjectRenderer;
    exceptionAttributes?: ExceptionAttributeMode;
    diagnostics?: boolean;
    loggerName?: string;
}
export interface OpenTelemetrySinkProviderOptions extends OpenTelemetrySinkOptionsBase {
    loggerProvider: ILoggerProvider;
}
export interface OpenTelemetrySinkExporterOptions extends OpenTelemetrySinkOptionsBase {
    loggerProvider?: undefined;
    otlpExporterConfig?: OtlpHttpExporterConfig;
    serviceName?: string;
    additionalResource?: Resource;
}
export type OpenTelemetrySinkOptions = OpenTelemetrySinkProviderOptions | OpenTelemetrySinkExporterOptions;
export interface OpenTelemetrySink extends Sink, AsyncDisposable {
    readonly ready: Promise<void>;
}
export declare function getOpenTelemetrySink(options?: OpenTelemetrySinkOptions): OpenTelemetrySink;
export {};
//# sourceMappingURL=otel.d.ts.map