import type { MetricsConfigureOptions } from './types';
export declare function configureMetrics(options?: MetricsConfigureOptions): Promise<void>;
export declare function disposeMetrics(): Promise<void>;
export declare function getMeter(name?: string, version?: string | undefined): import("@opentelemetry/api").Meter;
//# sourceMappingURL=client.d.ts.map