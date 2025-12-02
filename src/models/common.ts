/**
 * Discord embed structure
 */
export interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    url?: string;
}

/**
 * Token cache for API authentication
 */
export interface TokenCache {
    token: string;
    expiresAt: Date | null;
}
