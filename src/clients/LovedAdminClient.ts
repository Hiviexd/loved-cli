import { BaseApiClient } from "./BaseApiClient";
import type { MessageResponse, PollStartResponse, PollEndForumResponse, PollEndChatResponse } from "../models/types";

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
     * DELETE /nominations/:nominationId
     * Deletes a nomination
     */
    public async deleteNomination(nominationId: number): Promise<void> {
        try {
            await this.api.delete(`/nominations/${nominationId}`);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * POST /rounds/:roundId/messages
     * Sends messages to nominated mappers
     */
    public async sendMessages(
        roundId: number,
        pollStartGuess: string = "soon",
        dryRun: boolean = false
    ): Promise<MessageResponse> {
        try {
            const response = await this.api.post(`/rounds/${roundId}/messages`, {
                dry_run: dryRun,
                poll_start_guess: pollStartGuess,
            });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * POST /polls/:roundId/start
     * Starts polls for a round
     */
    public async startPolls(roundId: number, dryRun: boolean = false): Promise<PollStartResponse> {
        try {
            const response = await this.api.post(`/polls/${roundId}/start`, {
                dry_run: dryRun,
            });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * POST /polls/:roundId/end/forum
     * Ends polls and posts forum results
     */
    public async endPollsForum(roundId: number, dryRun: boolean = false): Promise<PollEndForumResponse> {
        try {
            const response = await this.api.post(`/polls/${roundId}/end/forum`, {
                dry_run: dryRun,
            });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * POST /polls/:roundId/end/chat
     * Ends polls and sends chat announcements
     */
    public async endPollsChat(roundId: number, dryRun: boolean = false): Promise<PollEndChatResponse> {
        try {
            const response = await this.api.post(`/polls/${roundId}/end/chat`, {
                dry_run: dryRun,
            });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }
}
