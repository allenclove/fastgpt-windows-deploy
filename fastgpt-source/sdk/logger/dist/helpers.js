import { SeverityNumber } from '@opentelemetry/api-logs';
export function mapLevelToSeverityNumber(level) {
    switch (level) {
        case 'trace':
            return SeverityNumber.TRACE;
        case 'debug':
            return SeverityNumber.DEBUG;
        case 'info':
            return SeverityNumber.INFO;
        case 'warning':
            return SeverityNumber.WARN;
        case 'error':
            return SeverityNumber.ERROR;
        case 'fatal':
            return SeverityNumber.FATAL;
        default:
            return SeverityNumber.UNSPECIFIED;
    }
}
//# sourceMappingURL=helpers.js.map