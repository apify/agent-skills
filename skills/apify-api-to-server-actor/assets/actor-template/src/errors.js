/**
 * An error that maps to an HTTP response. Everything the Actor rejects on its own
 * (unknown endpoint, rate limit, failed charge, unreachable upstream) is thrown as one of these.
 */
export class HttpError extends Error {
    constructor(status, type, message, headers = {}) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.type = type;
        this.headers = headers;
    }

    toJSON() {
        return { error: { type: this.type, message: this.message } };
    }
}
