/**
 * Simple rate limiter that ensures a minimum time between operations
 */
export class RateLimiter {
    private lastRun = 0;
    private queue: Array<() => void> = [];
    private running = false;

    /**
     * @param minInterval - Minimum milliseconds between operations
     */
    constructor(private minInterval: number) {}

    /**
     * Runs a function with rate limiting
     */
    async run<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const execute = async () => {
                const now = Date.now();
                const timeSinceLast = now - this.lastRun;
                const waitTime = Math.max(0, this.minInterval - timeSinceLast);

                if (waitTime > 0) {
                    await this.sleep(waitTime);
                }

                this.lastRun = Date.now();

                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.processQueue();
                }
            };

            this.queue.push(execute);
            if (!this.running) {
                this.processQueue();
            }
        });
    }

    private processQueue(): void {
        const next = this.queue.shift();
        if (next) {
            this.running = true;
            next();
        } else {
            this.running = false;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
