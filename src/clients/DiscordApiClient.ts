import { BaseApiClient } from "./BaseApiClient";
import { WebhookPayload } from "../models/discord";
import { AxiosError } from "axios";
import { NoTraceError } from "../utils/logger";
import chalk from "chalk";

interface DiscordErrorResponse {
    message?: string;
    code?: number;
    errors?: Record<string, unknown>;
    embeds?: string[];
}

export class DiscordApiClient extends BaseApiClient {
    constructor(webhookUrl: string) {
        super();
        this.api = this.createApi(`${webhookUrl}`, {});
    }

    /**
     * Sends a webhook to the Discord API
     * @param payload - The payload to send to the Discord API
     */
    public async sendWebhook(payload: WebhookPayload): Promise<void> {
        try {
            await this.api.post("", payload);
        } catch (error) {
            this.handleDiscordError(error);
        }
    }

    /**
     * Handles Discord-specific API errors with detailed validation messages
     */
    private handleDiscordError(error: unknown): never {
        const clientName = chalk.bgRed.black(` ${this.constructor.name} `);

        if (!(error instanceof Error)) {
            throw new NoTraceError(`${clientName} An unexpected error occurred`);
        }

        const axiosError = error as AxiosError<DiscordErrorResponse>;

        // Discord-specific error handling
        if (axiosError.response?.data) {
            const data = axiosError.response.data;
            const status = axiosError.response.status;

            // Discord validation errors (400)
            if (status === 400 && typeof data === "object") {
                let errorMessage = `${clientName} Discord webhook validation failed (400 Bad Request)\n`;

                // Handle Discord's structured error format
                if (data.message) {
                    errorMessage += `Message: ${data.message}\n`;
                }

                if (data.code) {
                    errorMessage += `Error Code: ${data.code}\n`;
                }

                // Handle validation errors for specific fields
                if (data.errors) {
                    errorMessage += `\nValidation Errors:\n`;
                    errorMessage += this.formatDiscordValidationErrors(data.errors);
                }

                // Handle simple array errors (like embed errors)
                if (data.embeds && Array.isArray(data.embeds)) {
                    errorMessage += `\nEmbed Errors:\n`;
                    data.embeds.forEach((err, i) => {
                        errorMessage += `  Embed ${i}: ${err}\n`;
                    });
                }

                // If no structured errors, show raw data
                if (!data.message && !data.errors && !data.embeds) {
                    errorMessage += `\nRaw error data:\n${JSON.stringify(data, null, 2)}`;
                }

                errorMessage += `\n💡 Tip: Check for invalid URLs, malformed embeds, or fields exceeding Discord's limits.`;
                throw new NoTraceError(errorMessage);
            }

            // Discord rate limiting (429)
            if (status === 429) {
                const retryAfter = axiosError.response.headers["retry-after"];
                const message = `${clientName} Rate limited by Discord (429 Too Many Requests)`;
                throw new NoTraceError(retryAfter ? `${message}\nRetry after: ${retryAfter} seconds` : message);
            }

            // Discord not found (404) - invalid webhook
            if (status === 404) {
                throw new NoTraceError(
                    `${clientName} Webhook not found (404)\nThe webhook URL may be invalid or deleted.`
                );
            }
        }

        // Fall back to base error handling for other errors
        this.handleError(error);
    }

    /**
     * Formats Discord's nested validation error structure into readable text
     */
    private formatDiscordValidationErrors(errors: Record<string, unknown>, indent = "  "): string {
        let result = "";

        for (const [field, value] of Object.entries(errors)) {
            if (typeof value === "object" && value !== null) {
                // Check if it's an error object with _errors array
                if ("_errors" in value && Array.isArray(value._errors)) {
                    const errorArray = value._errors as Array<{ code: string; message: string }>;
                    errorArray.forEach((err) => {
                        result += `${indent}${field}: ${err.message} (code: ${err.code})\n`;
                    });
                } else {
                    // Nested object, recurse
                    result += `${indent}${field}:\n`;
                    result += this.formatDiscordValidationErrors(value as Record<string, unknown>, indent + "  ");
                }
            } else {
                result += `${indent}${field}: ${value}\n`;
            }
        }

        return result;
    }
}
