import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import chalk from "chalk";
import { logAndExit, Logger } from "./logger";
import { readFile, writeFile } from "node:fs/promises";
import { CONFIG_FILE_NAME } from "../config";

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

/**
 * Prompts the user for a loved round ID, using the current saved value as default.
 * If the user inputs a different ID, it will update the config file with the new value.
 * @returns The round ID (either the existing one or the newly entered one)
 */
export async function promptRoundId(): Promise<number> {
    // Load existing config to get current round ID
    let currentRoundId = 0;
    try {
        const content = await readFile(`config/${CONFIG_FILE_NAME}`, "utf8");
        const config = JSON.parse(content) as { lovedRoundId?: number };
        currentRoundId = config.lovedRoundId ?? 0;
    } catch {
        // Config file doesn't exist or is invalid, use default of 0
        currentRoundId = 0;
    }

    const defaultValue = currentRoundId > 0 ? currentRoundId.toString() : undefined;
    const answer = await prompt(chalk.yellow("Input the ID of the Loved round you're currently operating on"), {
        defaultValue,
        showSkipHint: !defaultValue,
    });

    const newRoundId = answer.trim() ? parseInt(answer.trim(), 10) : currentRoundId;

    // If the user entered a different ID, update the config file
    if (newRoundId !== currentRoundId && answer.trim()) {
        try {
            const content = await readFile(`config/${CONFIG_FILE_NAME}`, "utf8");
            const config = JSON.parse(content) as Record<string, unknown>;
            config.lovedRoundId = newRoundId;
            await writeFile(`config/${CONFIG_FILE_NAME}`, JSON.stringify(config, null, 4) + "\n");
            console.log(chalk.green.dim(`Updated ${CONFIG_FILE_NAME} with new round ID: ${newRoundId}`));
        } catch {
            // If we can't update the config, just return the new value
            // Warn the user that they need to update it manually
            console.log(chalk.yellow.dim("Failed to update the config file. Please update it manually."));
            console.log(chalk.yellow.dim(`Proceeding with value ${newRoundId} for this command.`));
        }
    }

    return newRoundId;
}
