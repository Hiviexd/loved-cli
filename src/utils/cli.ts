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
