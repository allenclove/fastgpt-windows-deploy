import type { LogLevel } from '@logtape/logtape';
import type { LogCategory, LoggerConfigureOptions } from './types';
export type LoggerEnvValue = string | boolean | number | undefined;
export type LoggerEnv = Record<string, LoggerEnvValue>;
export type LoggerConfigureFromEnvOptions = {
    env?: LoggerEnv;
    defaultCategory?: LogCategory;
    defaultServiceName?: string;
    defaultLoggerName?: string;
    defaultConsoleEnabled?: boolean;
    defaultConsoleLevel?: LogLevel;
    defaultOtelEnabled?: boolean;
    defaultOtelLevel?: LogLevel;
    defaultOtelUrl?: string;
    sensitiveProperties?: readonly string[];
};
export declare function createLoggerOptionsFromEnv(options?: LoggerConfigureFromEnvOptions): LoggerConfigureOptions;
export declare function configureLoggerFromEnv(options?: LoggerConfigureFromEnvOptions): Promise<void>;
//# sourceMappingURL=env.d.ts.map