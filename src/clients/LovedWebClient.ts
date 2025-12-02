import Ruleset from "../models/Ruleset";
import type { RoundInfo, Nomination, GameModeExtraInfo, User } from "../models/types";
import { logInfo, logWarning } from "../utils/logger";
import { BaseApiClient } from "./BaseApiClient";

const INTEROP_VERSION = "8";

/**
 * Client for interacting with the loved.sh API
 */
export class LovedWebClient extends BaseApiClient {
    constructor(baseUrl: string, apiKey: string) {
        super();
        this.api = this.createApi(`${baseUrl}/api/local-interop`, {
            "X-Loved-InteropKey": apiKey,
            "X-Loved-InteropVersion": INTEROP_VERSION,
        });
    }

    /**
     * Fetches round information including nominations and metadata
     */
    async getRoundInfo(roundId: number): Promise<RoundInfo> {
        try {
            const response = await this.api.get("/data", { params: { roundId } });
            const {
                discord_webhooks: discordWebhooks,
                nominations,
                results_post_ids: resultsPostIds,
                round,
            } = response.data;

            const extraGameModeInfo: Record<number, GameModeExtraInfo> = {};

            // Process each game mode
            for (const gameMode of Ruleset.all()) {
                const gameModeInfo = round.game_modes[gameMode.id];

                if (!gameModeInfo.nominations_locked) {
                    logWarning(`${gameMode.longName} nominations are not locked on loved.sh`);
                }

                extraGameModeInfo[gameMode.id] = {
                    descriptionAuthors: [],
                    nominators: [],
                    threshold: gameModeInfo.voting_threshold,
                    thresholdFormatted: (gameModeInfo.voting_threshold * 100).toFixed() + "%",
                    video: gameModeInfo.video,
                };

                if (resultsPostIds[gameMode.id] == null) {
                    logWarning(`${gameMode.longName} last round results post is not set`);
                }
            }

            // Process nominations
            for (const nomination of nominations) {
                // Warn about placeholder creator IDs
                for (const creator of nomination.beatmapset_creators as User[]) {
                    if (creator.id >= 4294000000) {
                        logWarning(
                            `Creator ${creator.name} on nomination #${nomination.id} has placeholder ID (#${creator.id})`
                        );
                    }
                }

                // Convert game_mode to Ruleset instance
                nomination.game_mode = new Ruleset(nomination.game_mode);

                const extras = extraGameModeInfo[nomination.game_mode.id];

                // Track description authors
                if (
                    nomination.description_author != null &&
                    extras.descriptionAuthors.find((a: User) => a.id === nomination.description_author.id) == null
                ) {
                    extras.descriptionAuthors.push(nomination.description_author);
                }

                // Track nominators
                for (const nominator of nomination.nominators as User[]) {
                    if (extras.nominators.find((n: User) => n.id === nominator.id) == null) {
                        extras.nominators.push(nominator);
                    }
                }

                // Handle artist/title overwrites
                nomination.beatmapset.original_artist = nomination.beatmapset.artist;
                nomination.beatmapset.original_title = nomination.beatmapset.title;
                nomination.beatmapset.artist = nomination.overwrite_artist || nomination.beatmapset.artist;
                nomination.beatmapset.title = nomination.overwrite_title || nomination.beatmapset.title;
            }

            // Sort nominators alphabetically
            for (const gameMode of Ruleset.all()) {
                extraGameModeInfo[gameMode.id].nominators.sort((a: User, b: User) => a.name.localeCompare(b.name));
            }

            return {
                allNominations: nominations as Nomination[],
                discordWebhooks,
                extraGameModeInfo,
                intro: round.news_intro ?? "",
                introPreview: round.news_intro_preview ?? "",
                name: round.name,
                newsAuthorName: round.news_author.name,
                newsAuthorId: round.news_author.id,
                nominations: (nominations as Nomination[]).filter((n) => n.parent_id == null),
                outro: round.news_outro ?? "",
                postTime: new Date(round.news_posted_at),
                resultsPostIds,
                title: `Project Loved: ${round.name}`,
                video: round.video,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Gets topic IDs for nominations in a round
     */
    async getRoundTopicIds(roundId: number): Promise<Record<number, number>> {
        try {
            const response = await this.api.get("/topic-ids", { params: { roundId } });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Gets available rounds
     */
    async getRoundsAvailable(): Promise<Array<{ id: number; name: string }>> {
        try {
            const response = await this.api.get("/rounds-available");
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Creates forum polls for a round
     */
    async createPolls(
        roundId: number,
        mainTopicBodies: Record<number, string>,
        nominationTopicBodies: Record<number, string>
    ): Promise<{
        mainTopicIds: number[];
        mainTopicIdsMap: Record<number, number>;
        nominationTopicIds: Record<number, number>;
    }> {
        logInfo("[loved.sh] Creating forum polls");
        logInfo("[loved.sh] This may take a few minutes...");

        try {
            const response = await this.api.post("/news", {
                mainTopicBodies,
                nominationTopicBodies,
                roundId,
            });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Posts voting results for a round
     */
    async postResults(roundId: number, mainTopicIds: Record<number, number>): Promise<void> {
        logInfo("[loved.sh] Posting replies to forum");
        logInfo("[loved.sh] This may take a few minutes...");

        try {
            await this.api.post("/results", { mainTopicIds, roundId });
        } catch (error) {
            this.handleError(error);
        }
    }
}

