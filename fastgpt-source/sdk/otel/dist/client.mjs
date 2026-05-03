import { configureLogger, disposeLogger, getLogger } from './logger';
import { configureMetrics, disposeMetrics, getMeter } from './metrics';
import { configureTracing, disposeTracing, getCurrentSpanContext, getTracer } from './tracing';
export async function configureOtel(options = {}) {
    await Promise.all([
        configureLogger(options.logger ?? {}),
        configureMetrics(options.metrics ?? {}),
        configureTracing(options.tracing ?? {})
    ]);
}
export async function disposeOtel() {
    await Promise.all([disposeLogger(), disposeMetrics(), disposeTracing()]);
}
export { getCurrentSpanContext, getLogger, getMeter, getTracer };
//# sourceMappingURL=client.js.map