/**
 * Sleeps for a given number of milliseconds
 * @param ms The number of milliseconds to sleep
 * @returns A promise that resolves after the given number of milliseconds
 */
export async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gets the current year, month, and day
 * @returns The current year, month, and day in the format YYYY-MM-DD
 */
export function getYearMonthDay(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Gets the current hour, minute, and second
 * @returns The current hour, minute, and second in the format HH-MM-SS
 */
export function getHourMinuteSecond(): string {
    return new Date().toISOString().slice(11, 19).replace(/:/g, "-");
}
