export function parseBooleanEnv(value, defaultValue) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value !== 'string' || !value)
        return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized))
        return true;
    if (['0', 'false', 'no', 'off'].includes(normalized))
        return false;
    return defaultValue;
}
export function parseNumberEnv(value, defaultValue) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value !== 'string')
        return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}
export function parsePositiveNumberEnv(value, defaultValue) {
    const parsed = parseNumberEnv(value, defaultValue);
    return parsed > 0 ? parsed : defaultValue;
}
export function parseStringEnv(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
//# sourceMappingURL=env-utils.js.map