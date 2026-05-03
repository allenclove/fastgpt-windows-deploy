import { type LoggerConfigureFromEnvOptions, type LoggerEnv } from './logger';
import { type MetricsConfigureFromEnvOptions, type MetricsEnv } from './metrics';
import type { TracingConfigureFromEnvOptions, TracingEnv } from './tracing';
import type { OtelConfigureOptions } from './types';
type OtelEnv = LoggerEnv & MetricsEnv & TracingEnv;
export type OtelConfigureFromEnvOptions = {
    env?: OtelEnv;
    defaultServiceName?: string;
    logger?: Omit<LoggerConfigureFromEnvOptions, 'env' | 'defaultServiceName'>;
    metrics?: Omit<MetricsConfigureFromEnvOptions, 'env' | 'defaultServiceName'>;
    tracing?: Omit<TracingConfigureFromEnvOptions, 'env' | 'defaultServiceName'>;
};
export declare function createOtelOptionsFromEnv(options?: OtelConfigureFromEnvOptions): OtelConfigureOptions;
export declare function configureOtelFromEnv(options?: OtelConfigureFromEnvOptions): Promise<void>;
export {};
//# sourceMappingURL=env.d.ts.map