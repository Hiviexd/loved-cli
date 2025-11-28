/**
 * Characters that have special meaning in Markdown and need escaping
 */
const MARKDOWN_SPECIAL_CHARS = /[\\*_~`\[\]()#>+\-.|!]/g;

/**
 * Escapes a single markdown special character
 */
function escapeChar(char: string): string {
    return `\\${char}`;
}

/**
 * Escapes all markdown special characters in plain text.
 * Use this when you want text to appear literally in markdown output.
 *
 * @example
 * escapeMarkdown("Hello *world*") // "Hello \\*world\\*"
 * escapeMarkdown("[test]") // "\\[test\\]"
 */
export function escapeMarkdown(text: string): string {
    if (typeof text !== "string") {
        return String(text);
    }
    return text.replace(MARKDOWN_SPECIAL_CHARS, escapeChar);
}

/**
 * Escapes markdown characters that could interfere with formatting,
 * but preserves intentional markdown links [text](url).
 * This is useful when you have text that may contain markdown link syntax
 * that should be preserved.
 */
export function escapeMarkdownPreserveLinks(text: string): string {
    if (typeof text !== "string") {
        return String(text);
    }

    // Match markdown links and escape everything else
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkPattern.exec(text)) !== null) {
        // Escape text before the link
        if (match.index > lastIndex) {
            parts.push(escapeMarkdown(text.slice(lastIndex, match.index)));
        }
        // Keep the link as-is (but escape the link text)
        parts.push(`[${escapeMarkdown(match[1])}](${match[2]})`);
        lastIndex = match.index + match[0].length;
    }

    // Escape remaining text after last link
    if (lastIndex < text.length) {
        parts.push(escapeMarkdown(text.slice(lastIndex)));
    }

    return parts.length > 0 ? parts.join("") : escapeMarkdown(text);
}

/**
 * Converts BBCode to Markdown.
 *
 * Supported BBCode tags:
 * - [b]bold[/b] -> **bold**
 * - [i]italic[/i] -> *italic*
 * - [u]underline[/u] -> underline (no markdown equivalent)
 * - [s]strikethrough[/s] -> ~~strikethrough~~
 * - [url=link]text[/url] -> [text](link)
 * - [color=...]text[/color] -> text (color removed)
 * - [quote]text[/quote] -> > text
 *
 * Plain text between BBCode tags is escaped to prevent unintended formatting.
 */
export function convertToMarkdown(bbcode: string): string {
    if (typeof bbcode !== "string") {
        return String(bbcode);
    }

    let result = bbcode;

    // First, convert BBCode tags to markdown
    // We use placeholders to protect converted markdown from being escaped

    // Store converted parts with unique placeholders
    const placeholders: Map<string, string> = new Map();
    let placeholderIndex = 0;

    function createPlaceholder(markdown: string): string {
        const key = `\x00PH${placeholderIndex++}\x00`;
        placeholders.set(key, markdown);
        return key;
    }

    // Convert [url=...]...[/url] to [text](url)
    result = result.replace(/\[url=([^\]]+)\](.+?)\[\/url\]/gis, (_, url, text) => {
        return createPlaceholder(`[${escapeMarkdown(text)}](${url})`);
    });

    // Convert [b]...[/b] to **...**
    result = result.replace(/\[b\](.+?)\[\/b\]/gis, (_, content) => {
        return createPlaceholder(`**${content}**`);
    });

    // Convert [i]...[/i] to *...*
    result = result.replace(/\[i\](.+?)\[\/i\]/gis, (_, content) => {
        return createPlaceholder(`*${content}*`);
    });

    // Convert [u]...[/u] - no markdown equivalent, just keep text
    result = result.replace(/\[u\](.+?)\[\/u\]/gis, "$1");

    // Convert [s]...[/s] to ~~...~~
    result = result.replace(/\[s\](.+?)\[\/s\]/gis, (_, content) => {
        return createPlaceholder(`~~${content}~~`);
    });

    // Convert [color=...]...[/color] - remove color, keep text
    result = result.replace(/\[color=[^\]]+\](.+?)\[\/color\]/gis, "$1");

    // Convert [quote]...[/quote] or [quote="..."]...[/quote] to > ...
    result = result.replace(/\[quote(?:="[^"]*")?\](.+?)\[\/quote\]/gis, (_, content) => {
        // Add > prefix to each line
        const quoted = content
            .split("\n")
            .map((line: string) => `> ${line}`)
            .join("\n");
        return createPlaceholder(quoted);
    });

    // Now escape any remaining markdown special characters in non-placeholder text
    // Split by placeholders, escape, and rejoin
    const parts = result.split(/(\x00PH\d+\x00)/);
    result = parts
        .map((part) => {
            if (placeholders.has(part)) {
                return placeholders.get(part)!;
            }
            return escapeMarkdown(part);
        })
        .join("");

    // Handle single newlines -> markdown line breaks (two spaces + newline or backslash + newline)
    // Only convert single newlines, not double newlines (which are paragraph breaks)
    result = result.replace(/([^\n])\n([^\n])/g, "$1\\\n$2");

    return result.trim();
}

/**
 * Expands root-relative URLs in BBCode to full osu.ppy.sh URLs.
 * Converts [url=/path] to [url=https://osu.ppy.sh/path]
 */
export function expandBbcodeRootLinks(text: string, baseUrl = "https://osu.ppy.sh"): string {
    if (typeof text !== "string") {
        return String(text);
    }
    return text.replace(/\[url=\/([^\]]+)\]/gi, `[url=${baseUrl}/$1]`);
}
