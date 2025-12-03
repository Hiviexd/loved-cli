import { BaseApiClient } from "./BaseApiClient";
import type { MessageResponse, PollStartResponse, PollEndForumResponse, PollEndChatResponse } from "../models/types";
import { Logger } from "../utils/logger";
import { exportDryRun } from "../utils/dry-runs";

const log = new Logger("loved-admin");

/**
 * Client for interacting with the admin.loved.sh API
 */
export class LovedAdminClient extends BaseApiClient {
    constructor(baseUrl: string, apiKey: string) {
        super();
        this.api = this.createApi(`${baseUrl}`, {
            "X-Key": apiKey,
        });
    }

    /**
     * Deletes a nomination
     * @param nominationId The ID of the nomination to delete
     * @endpoint `DELETE` `/nominations/:nominationId`
     */
    public async deleteNomination(nominationId: number): Promise<void> {
        try {
            log.info(`Executing DELETE /nominations/${nominationId}`);
            await this.api.delete(`/nominations/${nominationId}`);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Sends messages to nominated mappers
     * @param roundId The ID of the round to send messages for
     * @param pollStartGuess The guess for when the polls will start (default: "soon")
     * @param dryRun Whether to run the operation in dry run mode (no changes are made)
     * @endpoint `POST` `/rounds/:roundId/messages`
     */
    public async sendMessages(
        roundId: number,
        pollStartGuess: string = "soon",
        dryRun: boolean = false
    ): Promise<MessageResponse> {
        try {
            log.dim().info(`Executing POST /rounds/${roundId}/messages with options:`);
            log.dim().info(`dry_run: ${dryRun}`);
            log.dim().info(`poll_start_guess: ${pollStartGuess}`);
            const response = await this.api.post(`/rounds/${roundId}/messages`, {
                dry_run: dryRun,
                poll_start_guess: pollStartGuess,
            });

            if (dryRun) {
                exportDryRun("message", response.data);
            }

            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Starts polls for a round
     * @param roundId The ID of the round to start polls for
     * @param dryRun Whether to run the operation in dry run mode (no changes are made)
     * @endpoint `POST` `/polls/:roundId/start`
     */
    public async startPolls(roundId: number, dryRun: boolean = false): Promise<PollStartResponse> {
        try {
            log.dim().info(`Executing POST /polls/${roundId}/start with options:`);
            log.dim().info(`dry_run: ${dryRun}`);
            const response = await this.api.post(`/polls/${roundId}/start`, {
                dry_run: dryRun,
            });

            if (dryRun) {
                exportDryRun("poll-start", response.data);
            }

            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Performs forum operations for ending a round:
     * - Replies to all active polls with the results and locks them
     * - Posts results in the main threads and unpins them
     * @param roundId The ID of the round to end polls for
     * @param dryRun Whether to run the operation in dry run mode (no changes are made)
     * @param force Whether to disregard the poll timers and process results immediately
     * @endpoint `POST` `/polls/:roundId/end/forum`
     */
    public async endPollsForum(
        roundId: number,
        dryRun: boolean = false,
        force: boolean = false
    ): Promise<PollEndForumResponse> {
        try {
            log.dim().info(`Executing POST /polls/${roundId}/end/forum with options:`);
            log.dim().info(`dry_run: ${dryRun}`);
            log.dim().info(`force: ${force}`);
            const response = await this.api.post(
                `/polls/${roundId}/end/forum`,
                {
                    dry_run: dryRun,
                },
                {
                    params: force ? { force: 1 } : undefined,
                }
            );

            if (dryRun) {
                exportDryRun("poll-end-forum", response.data);
            }

            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Performs chat operations for ending a round:
     * - Sends a congratulatory message to all mappers and GDers whose maps passed the polls
     * @param roundId The ID of the round to end polls for
     * @param dryRun Whether to run the operation in dry run mode (no changes are made)
     * @param force Whether to disregard the poll timers and process results immediately
     * @endpoint `POST` `/polls/:roundId/end/chat`
     */
    public async endPollsChat(
        roundId: number,
        dryRun: boolean = false,
        force: boolean = false
    ): Promise<PollEndChatResponse> {
        try {
            log.dim().info(`Executing POST /polls/${roundId}/end/chat with options:`);
            log.dim().info(`dry_run: ${dryRun}`);
            log.dim().info(`force: ${force}`);
            const response = await this.api.post(
                `/polls/${roundId}/end/chat`,
                {
                    dry_run: dryRun,
                },
                {
                    params: force ? { force: 1 } : undefined,
                }
            );

            if (dryRun) {
                exportDryRun("poll-end-chat", response.data);
            }

            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }
}
