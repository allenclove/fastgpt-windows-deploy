export function createLoggers({ composedSinks }) {
    const metaSinks = composedSinks.includes('console') ? ['console'] : composedSinks;
    return [
        {
            category: [],
            lowestLevel: 'trace',
            sinks: composedSinks
        },
        ...(metaSinks.length === 0
            ? []
            : [
                {
                    category: ['logtape', 'meta'],
                    lowestLevel: 'fatal',
                    parentSinks: 'override',
                    sinks: metaSinks
                }
            ])
    ];
}
//# sourceMappingURL=loggers.js.map