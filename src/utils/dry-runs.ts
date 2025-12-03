import type { AdminApiResponse } from "../models/admin-api";
import { join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { Logger } from "./logger";
import { getYearMonthDay, getHourMinuteSecond } from "./misc";

const LOGS_PATH = "logs";
const log = new Logger("dry-runs");

/**
 * Export dry run output to /logs/*.json
 */
export function exportDryRun<T = unknown>(
    type: "message" | "poll-start" | "poll-end-forum" | "poll-end-chat",
    data: AdminApiResponse<T>
): void {
    // Create folder for today's logs
    const logsDir = join(LOGS_PATH, getYearMonthDay());
    mkdirSync(logsDir, { recursive: true });

    // Write to /logs/YYYY-MM-DD/HH-MM-SS-type.json
    const filename = `${getHourMinuteSecond()}-${type}.json`;
    const writePath = join(LOGS_PATH, getYearMonthDay(), filename);
    writeFileSync(writePath, JSON.stringify(data, null, 4));

    log.success(`Dry run output for ${type} exported to ${writePath}`);
}
