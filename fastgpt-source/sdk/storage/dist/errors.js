export class NoSuchBucketError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NoSuchBucketError';
    }
}
export class NoBucketReadPermissionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NoBucketReadPermissionError';
    }
}
export class EmptyObjectError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EmptyObjectError';
    }
}
//# sourceMappingURL=errors.js.map