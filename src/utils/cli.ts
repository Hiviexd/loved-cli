import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import chalk from "chalk";
import { logAndExit, Logger } from "./logger";

/**
 * Checks if only one flag in a group is set
 * @param log The logger instance to use
 * @param flags The flags to check
 * @param groupName The name of the group of flags
 */
export function checkMutuallyExclusiveFlags(log: Logger, flags: Record<string, boolean>, groupName = "flags"): void {
    const setFlags = Object.entries(flags)
        .filter(([, value]) => value)
        .map(([key]) => key);
    if (setFlags.length > 1) {
        logAndExit(log, `You can only use one ${groupName} at a time: ${setFlags.join(", ")}`);
    }
}

/**
 * Checks if a flag conflicts with its skip version
 * @param log The logger instance to use
 * @param conflicts The conflicts to check
 */
export function checkFlagConflicts(log: Logger, conflicts: [boolean, boolean, string][]): void {
    for (const [flag, skipFlag, message] of conflicts) {
        if (flag && skipFlag) logAndExit(log, `Cannot use ${message} together`);
    }
}

/**
 * Prompts the user for input with an optional default value.
 * @param message The message to display to the user
 * @param options The options for the prompt
 * @param options.defaultValue The default value to use if the user does not provide input
 * @param options.showSkipHint Whether to show a skip hint when no default value exists
 * @param options.input The input stream to use (default: stdin)
 * @param options.output The output stream to use (default: stdout)
 * @returns The input from the user
 */
export async function prompt(
    message: string,
    options?: {
        defaultValue?: string;
        showSkipHint?: boolean;
        input?: NodeJS.ReadableStream;
        output?: NodeJS.WritableStream;
    }
): Promise<string> {
    const { defaultValue, showSkipHint, input = stdin, output = stdout } = options ?? {};
    const rl = createInterface({ input, output });

    try {
        const defaultHint = defaultValue ? chalk.dim(` (${defaultValue})`) : showSkipHint ? chalk.dim(" (skip)") : "";
        const answer = await rl.question(`${message}${defaultHint}: `);
        return answer.trim() || defaultValue || "";
    } finally {
        rl.close();
    }
}
