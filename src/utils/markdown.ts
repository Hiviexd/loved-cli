/**
 * Escapes Markdown syntax so the text renders literally.
 * Handles universal symbols, image markers, and structural
 * elements at line start (headings, blockquotes, list bullets).
 *
 * @param text - Text to escape.
 * @returns Escaped Markdown-safe text.
 */
export function escapeMarkdown(text: string): string {
    if (typeof text !== "string") return String(text);

    // Escape universal special characters
    text = text.replace(/[\\`*_{}[\]<>]/g, (m) => "\\" + m);

    // Escape image markers "![" → "\!["
    text = text.replace(/!\[/g, "\\![");

    // Escape headings only at start of line: "# "
    text = text.replace(/^(#+)(\s)/gm, (_, hashes, space) => {
        return `${"\\".repeat(hashes.length)}${hashes}${space}`;
    });

    // Escape blockquotes only at start: "> "
    text = text.replace(/^>(\s)/gm, "\\>$1");

    // Escape list markers only at start of line: "-", "*", "+"
    text = text.replace(/^(\s*)([*+-])(\s)/gm, (_, indent, bullet, space) => {
        return `${indent}\\${bullet}${space}`;
    });

    return text;
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

    // Store converted parts with unique placeholders to protect them from escaping
    const placeholders: Map<string, string> = new Map();
    let placeholderIndex = 0;

    function createPlaceholder(markdown: string): string {
        const key = `__PLACEHOLDER_${placeholderIndex++}__`;
        placeholders.set(key, markdown);
        return key;
    }

    // Process tags iteratively to handle nested/chained tags like [b][i]text[/i][/b]
    // The non-greedy regex naturally processes innermost tags first
    let hasChanged = true;
    let iterations = 0;
    const maxIterations = 50; // Prevent infinite loops

    while (hasChanged && iterations < maxIterations) {
        iterations++;
        const before = result;

        // Remove tags that don't map to markdown
        result = result.replace(/\[u\](.+?)\[\/u\]/gis, "$1");
        result = result.replace(/\[color=[^\]]+\](.+?)\[\/color\]/gis, "$1");

        // Convert formatting tags to markdown with placeholders
        // Convert [s]...[/s] to ~~...~~
        result = result.replace(/\[s\](.+?)\[\/s\]/gis, (_, content) => {
            return `${createPlaceholder("~~")}${content}${createPlaceholder("~~")}`;
        });
        // Convert [i]...[/i] to *...*
        result = result.replace(/\[i\](.+?)\[\/i\]/gis, (_, content) => {
            return `${createPlaceholder("*")}${content}${createPlaceholder("*")}`;
        });
        // Convert [b]...[/b] to **...**
        result = result.replace(/\[b\](.+?)\[\/b\]/gis, (_, content) => {
            return `${createPlaceholder("**")}${content}${createPlaceholder("**")}`;
        });

        // Convert [url=...]...[/url] to [text](url)
        result = result.replace(/\[url=([^\]]+)\](.+?)\[\/url\]/gis, (_, url, text) => {
            return createPlaceholder(`[${text}](${url})`);
        });

        // Convert [quote]...[/quote] to > ...
        result = result.replace(/\[quote(?:="[^"]*")?\](.+?)\[\/quote\]/gis, (_, content) => {
            const quoted = content
                .split("\n")
                .map((line: string) => `> ${line}`)
                .join("\n");
            return createPlaceholder(quoted);
        });

        hasChanged = result !== before;
    }

    // Now escape any remaining markdown special characters in non-placeholder text
    // Split by placeholders, escape, and rejoin
    const parts = result.split(/(__PLACEHOLDER_\d+__)/);
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
