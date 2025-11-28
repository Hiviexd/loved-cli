/**
 * Formats a number as a percentage string
 */
export function formatPercent(number: number): string {
    return (number * 100).toFixed(2) + "%";
}

/**
 * Joins an array with commas and "and" for the last element
 * @example joinList(['a', 'b', 'c']) => 'a, b, and c'
 */
export function joinList(array: string[]): string {
    if (array.length < 3) {
        return array.join(" and ");
    }
    return array.slice(0, -1).join(", ") + ", and " + array.at(-1);
}

/**
 * Returns the maximum value of a property in an array of objects
 */
export function maxOf<T>(array: T[], key: keyof T): T[keyof T] {
    const reducer = (prev: T, curr: T) => (prev[key] > curr[key] ? prev : curr);
    return array.reduce(reducer)[key];
}

/**
 * Returns the minimum value of a property in an array of objects
 */
export function minOf<T>(array: T[], key: keyof T): T[keyof T] {
    const reducer = (prev: T, curr: T) => (prev[key] < curr[key] ? prev : curr);
    return array.reduce(reducer)[key];
}

/**
 * Pushes values to an array if they don't already exist (based on comparison function)
 */
export function pushUnique<T>(array: T[], values: T[], sameFn: (a: T, b: T) => boolean): void {
    for (const value of values) {
        if (array.find((value2) => sameFn(value, value2)) == null) {
            array.push(value);
        }
    }
}

/**
 * Converts a YouTube video ID or MP4 link to a Discord-friendly format
 */
export function videoDiscord(videoIdOrLink: string | null | undefined): string | null {
    if (typeof videoIdOrLink !== "string") {
        return null;
    }

    // MP4 video link
    if (videoIdOrLink.startsWith("http")) {
        return videoIdOrLink;
    }

    // YouTube video ID
    return `https://www.youtube.com/watch?v=${videoIdOrLink}`;
}

/**
 * Converts a YouTube video ID or MP4 link to HTML embed format
 */
export function videoHtml(videoIdOrLink: string | null | undefined): string | null {
    if (typeof videoIdOrLink !== "string") {
        return null;
    }

    // MP4 video link
    if (videoIdOrLink.startsWith("http")) {
        return [
            '<div align="center">',
            '  <video width="95%" controls>',
            `    <source src="${videoIdOrLink}" type="video/mp4" preload="none">`,
            "  </video>",
            "</div>",
        ].join("\n");
    }

    // YouTube video ID
    return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoIdOrLink}?rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}
