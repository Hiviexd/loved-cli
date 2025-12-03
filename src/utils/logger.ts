import chalk from "chalk";
import { inspect } from "node:util";

// ? Shared error utils

/**
 * Error class that doesn't show stack trace when logged
 */
export class NoTraceError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = "NoTraceError";
    }
}

/**
 * Resolves an error message from an unknown error
 */
function resolveErrorMessage(error: unknown): string {
    if (typeof error === "string") return error;
    if (error instanceof NoTraceError) return error.message;
    if (error instanceof Error) return inspect(error);
    return "Unknown error";
}

/**
 * Logs an error to the console natively
 * @param error The error to log
 */
function nativeLogError(error: unknown) {
    console.error(chalk.red(resolveErrorMessage(error)));
}

/**
 * Logs an error to the console and exits the process
 * @param error The error to natively log or logger instance to log the error with
 */
export function logAndExit(error: Logger | unknown, text?: string): never {
    if (error instanceof Logger) {
        error.error(text);
    } else {
        nativeLogError(error);
    }

    process.exit(1);
}

// ? Color config

const textColors = {
    success: chalk.green,
    info: chalk.blue,
    warning: chalk.yellow,
    error: chalk.red,
};

type Severity = "success" | "info" | "warning" | "error";

// ? Logger class

export class Logger {
    private moduleTag: string;
    private dimNext = false;

    constructor(moduleName: string) {
        this.moduleTag = chalk.cyanBright(`[${moduleName}]`);
    }

    /**
     * Enable dim for ONE chained call.
     * Example: logger.dim().info("msg")
     */
    dim(): this {
        this.dimNext = true;
        return this;
    }

    // format HH:MM:SS
    private time() {
        const d = new Date();
        return chalk.gray(
            `${d.getHours().toString().padStart(2, "0")}:` +
                `${d.getMinutes().toString().padStart(2, "0")}:` +
                `${d.getSeconds().toString().padStart(2, "0")}`
        );
    }

    private styleMessage(sev: Severity, msg: string) {
        const colored = textColors[sev](msg);
        const styled = this.dimNext ? chalk.dim(colored) : colored;
        this.dimNext = false; // reset after one use
        return styled;
    }

    private base(sev: Severity, msg: string) {
        return `${this.time()} ${this.moduleTag} ${this.styleMessage(sev, msg)}`;
    }

    success(msg: unknown) {
        console.log(this.base("success", String(msg)));
    }

    info(msg: unknown) {
        console.log(this.base("info", String(msg)));
    }

    warning(msg: unknown) {
        console.warn(this.base("warning", String(msg)));
    }

    /**
     * Logs an error to the console
     * @param error The error to log and resolve
     */
    error(error: unknown) {
        const resolved = resolveErrorMessage(error);
        console.error(this.base("error", resolved));
    }
}
