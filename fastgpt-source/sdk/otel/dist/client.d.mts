import { getLogger } from './logger';
import { getMeter } from './metrics';
import { getCurrentSpanContext, getTracer } from './tracing';
import type { OtelConfigureOptions } from './types';
export declare function configureOtel(options?: OtelConfigureOptions): Promise<void>;
export declare function disposeOtel(): Promise<void>;
export { getCurrentSpanContext, getLogger, getMeter, getTracer };
//# sourceMappingURL=client.d.ts.map