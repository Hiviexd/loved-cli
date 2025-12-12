import axios from "axios";
import { DiscordEmbed } from "../../models/discord";
import { EmbedBuilder } from "./EmbedBuilder";
import { sleep } from "../misc";

/**
 * Builder class for configuring and sending Discord webhooks with a fluent API
 */
export class WebhookBuilder {
    private url: string = "";
    private embeds: DiscordEmbed[] = [];
    private message: string = "";
    private username: string = "";
    private avatarUrl: string = "";

    /**
     * Constructs a webhook link
     */
    public setWebhookUrl(url: string): this {
        this.url = url;
        return this;
    }

    /**
     * Add an embed to the webhook (accepts EmbedBuilder or DiscordEmbed)
     */
    public addEmbed(embed: EmbedBuilder | DiscordEmbed): this {
        if (embed instanceof EmbedBuilder) {
            this.embeds.push(embed.build());
        } else {
            this.embeds.push(embed);
        }
        return this;
    }

    /**
     * Set the webhook message content
     */
    public setMessage(message: string): this {
        this.message = message;
        return this;
    }

    /**
     * Set the webhook username
     */
    public setUsername(username: string): this {
        this.username = username;
        return this;
    }

    /**
     * Set the webhook avatar URL
     */
    public setAvatarUrl(avatarUrl: string): this {
        this.avatarUrl = avatarUrl;
        return this;
    }

    /**
     * Send the webhook
     */
    public async send(): Promise<void> {
        await axios.post(this.url, {
            username: this.username,
            avatar_url: this.avatarUrl,
            embeds: this.embeds,
            content: this.message,
        });

        await sleep(1000);
    }

    /**
     * Send the webhook in chunks when surpassing the embed limit.
     * @param maxEmbedsPerMessage - The maximum number of embeds per message.
     */
    public async sendChunked(maxEmbedsPerMessage = 10): Promise<void> {
        if (this.embeds.length === 0) {
            throw new Error("At least one embed is required");
        }

        // If within limit, behave like normal send()
        if (this.embeds.length <= maxEmbedsPerMessage) {
            return this.send();
        }

        // Otherwise split into chunks
        const embedChunks: DiscordEmbed[][] = [];
        for (let i = 0; i < this.embeds.length; i += maxEmbedsPerMessage) {
            embedChunks.push(this.embeds.slice(i, i + maxEmbedsPerMessage));
        }

        // Send first message with content + username + avatar
        await axios.post(this.url, {
            username: this.username,
            avatar_url: this.avatarUrl,
            content: this.message,
            embeds: embedChunks[0],
        });

        await sleep(1000);

        // Subsequent messages should *not repeat* content
        for (let i = 1; i < embedChunks.length; i++) {
            await axios.post(this.url, {
                username: this.username,
                avatar_url: this.avatarUrl,
                embeds: embedChunks[i],
            });

            await sleep(1000);
        }
    }
}
