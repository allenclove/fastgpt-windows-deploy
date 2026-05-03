import type { LogTapeConfig, LoggerSinkId } from './types';
type LoggerConfig = LogTapeConfig['loggers'];
type CreateLoggersOptions = {
    composedSinks: LoggerSinkId[];
};
export declare function createLoggers({ composedSinks }: CreateLoggersOptions): LoggerConfig;
export {};
//# sourceMappingURL=loggers.d.ts.map