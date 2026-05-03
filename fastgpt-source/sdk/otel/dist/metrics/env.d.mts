import type { MetricsConfigureOptions } from './types';
export type MetricsEnvValue = string | boolean | number | undefined;
export type MetricsEnv = Record<string, MetricsEnvValue>;
export type MetricsConfigureFromEnvOptions = {
    env?: MetricsEnv;
    defaultServiceName?: string;
    defaultMeterName?: string;
    defaultMetricsEnabled?: boolean;
    defaultMetricsUrl?: string;
    defaultExportIntervalMillis?: number;
};
export declare function createMetricsOptionsFromEnv(options?: MetricsConfigureFromEnvOptions): MetricsConfigureOptions;
export declare function configureMetricsFromEnv(options?: MetricsConfigureFromEnvOptions): Promise<void>;
//# sourceMappingURL=env.d.ts.map