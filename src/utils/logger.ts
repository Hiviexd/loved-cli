import chalk from "chalk";
import { inspect } from "node:util";

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
 * Logs an error to stderr with appropriate formatting
 */
export function log(error: unknown): void {
    let errorMessage = "Error occurred";

    if (typeof error === "string") {
        errorMessage = error;
    } else if (error instanceof Error) {
        errorMessage = error instanceof NoTraceError ? error.message : inspect(error);
    }

    if (errorMessage) {
        console.error(chalk.red(errorMessage));
    }
}

/**
 * Logs an error and exits the process
 */
export function logAndExit(error: unknown): never {
    log(error);
    process.exit(1);
}

/**
 * Log a dimmed info message
 */
export function logInfo(message: string): void {
    console.error(chalk.dim(message));
}

/**
 * Log a success message
 */
export function logSuccess(message: string): void {
    console.error(chalk.dim.green(message));
}

/**
 * Log a warning message
 */
export function logWarning(message: string): void {
    console.error(chalk.yellow(message));
}
