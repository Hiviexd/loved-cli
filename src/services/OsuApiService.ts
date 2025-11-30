import axios, { AxiosInstance } from "axios";
import chalk from "chalk";
import { RateLimiter } from "../utils/rate-limiter";
import { NoTraceError, logInfo, logSuccess } from "../utils/logger";
import type { TokenCache } from "../models/types";

/**
 * Pin type for forum topics
 * 0 = unpin, 1 = pin, 2 = announce
 */
export type PinType = 0 | 1 | 2;

/**
 * Service for interacting with the osu! API v2
 * Uses bot tokens (client_credentials) for authentication
 */
export class OsuApiService {
    private api: AxiosInstance;
    private limiter: RateLimiter;
    private chatToken: TokenCache = { token: "", expiresAt: null };
    private forumToken: TokenCache = { token: "", expiresAt: null };

    constructor(private baseUrl: string, private clientId: string, private clientSecret: string) {
        this.api = axios.create({ baseURL: `${baseUrl}/api/v2` });
        this.limiter = new RateLimiter(1000); // 1 request per second
    }

    /**
     * Gets a token with the specified scopes, caching it for reuse
     */
    private async getToken(cache: TokenCache, scopes: string, label: string): Promise<string> {
        if (cache.expiresAt && cache.expiresAt > new Date()) {
            return cache.token;
        }

        if (!this.clientId || !this.clientSecret) {
            throw new NoTraceError("Bot API client ID or secret is not set");
        }

        logInfo(`Requesting ${label} token...`);

        try {
            const response = await axios.post(`${this.baseUrl}/oauth/token`, {
                grant_type: "client_credentials",
                client_id: this.clientId,
                client_secret: this.clientSecret,
                scope: scopes,
            });

            cache.token = response.data.access_token;
            cache.expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
            logSuccess(`${label} token expires at ${cache.expiresAt.toISOString()}`);
            return cache.token;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new NoTraceError(`Failed to get ${label} token: ${error.response?.data?.error || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Gets a chat token with chat.write and chat.write_manage scopes
     */
    private getChatToken(): Promise<string> {
        return this.getToken(this.chatToken, "delegate chat.write chat.write_manage", "chat");
    }

    /**
     * Gets a forum token with forum.write and forum.write_manage scopes
     */
    private getForumToken(): Promise<string> {
        return this.getToken(this.forumToken, "delegate forum.write forum.write_manage", "forum");
    }

    /**
     * Pins, unpins, or announces a forum topic
     * @param topicId - The topic ID
     * @param type - 0 = unpin, 1 = pin, 2 = announce
     */
    async pinTopic(topicId: number, type: PinType = 1): Promise<void> {
        const token = await this.getForumToken();

        await this.limiter.run(async () => {
            try {
                await this.api.post(
                    `/forums/topics/${topicId}/pin`,
                    { pin: type },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const typeLabel = ["Unpinned", "Pinned", "Announced"][type];
                logSuccess(`${typeLabel} topic ${topicId}`);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new NoTraceError(
                        `Failed to pin topic ${topicId}: ${error.response?.data?.error || error.message}`
                    );
                }
                throw error;
            }
        });
    }

    /**
     * Locks a forum topic
     */
    async lockTopic(topicId: number): Promise<void> {
        const token = await this.getForumToken();

        await this.limiter.run(async () => {
            try {
                await this.api.post(
                    `/forums/topics/${topicId}/lock`,
                    { lock: true },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                logSuccess(`Locked topic ${topicId}`);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new NoTraceError(
                        `Failed to lock topic ${topicId}: ${error.response?.data?.error || error.message}`
                    );
                }
                throw error;
            }
        });
    }

    /**
     * Sends a chat announcement to one or more users
     */
    async sendChatAnnouncement(userIds: number[], name: string, description: string, message: string): Promise<void> {
        if (userIds.length === 0) {
            return;
        }

        const token = await this.getChatToken();

        await this.limiter.run(async () => {
            try {
                await this.api.post(
                    "/chat/channels",
                    {
                        channel: { name, description },
                        message,
                        target_ids: userIds,
                        type: "ANNOUNCE",
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                logSuccess(`Sent chat announcement to ${userIds.join(", ")}`);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    if (status === 404 || status === 422) {
                        console.error(
                            chalk.red(
                                `Failed to send chat announcement to ${userIds.join(
                                    ", "
                                )}:\n  One or more recipients not found`
                            )
                        );
                        return;
                    }
                    throw new NoTraceError(
                        `Failed to send chat announcement: ${error.response?.data?.error || error.message}`
                    );
                }
                throw error;
            }
        });
    }

    // ==================== DUMMY METHODS ====================
    // These methods require internal osu! website access and don't have public API equivalents

    /**
     * DUMMY: Uploads a cover image to a forum topic
     * This requires internal osu! website access
     */
    async storeTopicCover(filename: string, topicId: number): Promise<number> {
        console.log(chalk.yellow(`[DUMMY] storeTopicCover called for topic ${topicId} with file ${filename}`));
        return 0; // Return dummy cover ID
    }

    /**
     * DUMMY: Watches or unwatches a forum topic
     * This requires internal osu! website access
     */
    async watchTopic(topicId: number, watch = true): Promise<void> {
        console.log(chalk.yellow(`[DUMMY] watchTopic called for topic ${topicId}, watch=${watch}`));
    }

    /**
     * DUMMY: Gets pinned topic IDs for each game mode from a forum
     * This requires HTML scraping from the osu! website
     */
    async getModeTopics(_forumId: number): Promise<Record<number, number>> {
        console.log(chalk.yellow(`[DUMMY] getModeTopics called - returning empty object`));
        return {};
    }
}
