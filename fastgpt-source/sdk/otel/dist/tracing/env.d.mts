import type { TracingConfigureOptions } from './types';
export type TracingEnvValue = string | boolean | number | undefined;
export type TracingEnv = Record<string, TracingEnvValue>;
export type TracingConfigureFromEnvOptions = {
    env?: TracingEnv;
    defaultServiceName?: string;
    defaultTracerName?: string;
    defaultTracingEnabled?: boolean;
    defaultTracingUrl?: string;
    defaultSampleRatio?: number;
};
export declare function createTracingOptionsFromEnv(options?: TracingConfigureFromEnvOptions): TracingConfigureOptions;
export declare function configureTracingFromEnv(options?: TracingConfigureFromEnvOptions): Promise<void>;
//# sourceMappingURL=env.d.ts.map