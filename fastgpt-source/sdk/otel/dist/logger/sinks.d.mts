import type { LogTapeConfig, LoggerConfigureOptions, LoggerSinkId } from './types';
type SinkConfig = LogTapeConfig<string>['sinks'];
type CreateSinksOptions = Pick<LoggerConfigureOptions, 'console' | 'otel' | 'sensitiveProperties'>;
type CreateSinksResult = {
    sinks: SinkConfig;
    composedSinks: LoggerSinkId[];
};
export declare function createSinks(options: CreateSinksOptions): Promise<CreateSinksResult>;
export {};
//# sourceMappingURL=sinks.d.ts.map