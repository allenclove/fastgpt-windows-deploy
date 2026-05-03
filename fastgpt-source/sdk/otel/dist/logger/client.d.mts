import type { LogCategory, LoggerConfigureOptions } from './types';
export declare function configureLogger(options?: LoggerConfigureOptions): Promise<void>;
export declare function disposeLogger(): Promise<void>;
export declare function getLogger(category?: LogCategory): import("@logtape/logtape").Logger;
//# sourceMappingURL=client.d.ts.map