import type { TracingConfigureOptions } from './types';
export declare function configureTracing(options?: TracingConfigureOptions): Promise<void>;
export declare function disposeTracing(): Promise<void>;
export declare function getTracer(name?: string, version?: string | undefined): import("@opentelemetry/api").Tracer;
export declare function getCurrentSpanContext(): import("@opentelemetry/api").SpanContext | undefined;
//# sourceMappingURL=client.d.ts.map