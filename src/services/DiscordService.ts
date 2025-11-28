import chalk from "chalk";
import type { DiscordEmbed } from "../models/types.js";

/**
 * Discord message limits
 */
export const DISCORD_LIMITS = {
    maxLength: 2000,
    maxEmbeds: 10,
    maxEmbedTitleLength: 256,
} as const;

/**
 * Dummy Discord webhook service
 * This logs messages to console instead of sending to Discord
 * TODO: Implement actual Discord webhook integration
 */
export class DiscordService {
    constructor(private webhook: string) {}

    /**
     * Posts a message to Discord (dummy implementation - logs to console)
     *
     * @param username - The username to display
     * @param content - The message content
     * @param embeds - Optional embeds to include
     */
    async post(username: string, content: string | null, embeds?: DiscordEmbed[]): Promise<void> {
        console.log(chalk.magenta("\n═══════════════════════════════════════════════════════"));
        console.log(chalk.magenta(`[DISCORD - ${username}]`));
        console.log(chalk.magenta("═══════════════════════════════════════════════════════"));

        if (content) {
            // Split long content for display
            if (content.length > DISCORD_LIMITS.maxLength) {
                console.log(chalk.yellow(`[Content exceeds ${DISCORD_LIMITS.maxLength} chars, would be split]`));
            }
            console.log(content);
        }

        if (embeds && embeds.length > 0) {
            console.log(chalk.dim(`\n[${embeds.length} embed(s)]`));

            if (embeds.length > DISCORD_LIMITS.maxEmbeds) {
                console.log(chalk.yellow(`[Exceeds ${DISCORD_LIMITS.maxEmbeds} embed limit, would be split]`));
            }

            for (const embed of embeds) {
                console.log(chalk.cyan("───────────────────────────────────────"));
                if (embed.title) {
                    const titleDisplay =
                        embed.title.length > DISCORD_LIMITS.maxEmbedTitleLength
                            ? embed.title.slice(0, DISCORD_LIMITS.maxEmbedTitleLength - 3) + "..."
                            : embed.title;
                    console.log(chalk.bold(titleDisplay));
                }
                if (embed.description) {
                    console.log(embed.description);
                }
                if (embed.url) {
                    console.log(chalk.blue.underline(embed.url));
                }
                if (embed.color !== undefined) {
                    const colorHex = embed.color.toString(16).padStart(6, "0");
                    console.log(chalk.dim(`Color: #${colorHex}`));
                }
            }
        }

        console.log(chalk.magenta("═══════════════════════════════════════════════════════\n"));

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    /**
     * Splits a message into chunks that fit within Discord limits
     */
    static splitMessage(content: string): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < content.length; i += DISCORD_LIMITS.maxLength) {
            chunks.push(content.slice(i, i + DISCORD_LIMITS.maxLength));
        }
        return chunks;
    }

    /**
     * Splits embeds into batches that fit within Discord limits
     */
    static splitEmbeds(embeds: DiscordEmbed[]): DiscordEmbed[][] {
        const batches: DiscordEmbed[][] = [];
        for (let i = 0; i < embeds.length; i += DISCORD_LIMITS.maxEmbeds) {
            batches.push(embeds.slice(i, i + DISCORD_LIMITS.maxEmbeds));
        }
        return batches;
    }
}
