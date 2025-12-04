import axios, { AxiosInstance, AxiosError } from "axios";
import { NoTraceError } from "../utils/logger";

export abstract class BaseApiClient {
    /**
     * The authenticated axios instance
     */
    protected api!: AxiosInstance;

    /**
     * Gets a human-readable error message for HTTP status codes
     */
    private getStatusMessage(status: number, url?: string): string {
        const statusMessages: Record<number, string> = {
            400: "Bad Request - The request was invalid",
            401: "Unauthorized - Authentication required",
            403: "Forbidden - You don't have permission to access this route",
            404: "Not Found - The requested route was not found",
            408: "Request Timeout - The server timed out waiting for the request",
            429: "Too Many Requests - Rate limit exceeded, please try again later",
            500: "Internal Server Error - The server encountered an error",
            502: "Bad Gateway - The server is temporarily unavailable, please try again later",
            503: "Service Unavailable - The service is temporarily unavailable",
            504: "Gateway Timeout - The server did not respond in time",
        };

        const baseMessage = statusMessages[status] || `HTTP ${status} - Request failed`;
        return url ? `${baseMessage} (${url})` : baseMessage;
    }

    /**
     * Checks if the response data is HTML (like error pages)
     */
    private isHtmlResponse(data: unknown): boolean {
        if (typeof data === "string") {
            return data.trim().startsWith("<!DOCTYPE") || data.trim().startsWith("<html");
        }
        return false;
    }

    /**
     * Extracts the request URL from the error for context
     */
    private getRequestUrl(error: AxiosError): string {
        const baseURL = error.config?.baseURL || "";
        const url = error.config?.url || "";
        const method = error.config?.method?.toUpperCase() || "REQUEST";
        return `${method} ${baseURL}${url}`;
    }

    /**
     * Handles API errors and provides human-readable messages
     */
    protected handleError(error: unknown): never {
        const clientName = this.constructor.name.replace("Client", "");

        if (!axios.isAxiosError(error)) {
            throw new NoTraceError(`${clientName}: An unexpected error occurred: ${error}`);
        }

        const axiosError = error as AxiosError<{ error?: string } | string>;
        const requestUrl = this.getRequestUrl(axiosError);

        // Handle API error responses with JSON error messages
        if (axiosError.response?.data) {
            const data = axiosError.response.data;

            // Check if it's a structured error response
            if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
                throw new NoTraceError(`${clientName}: ${data.error}`);
            }

            // Check if response is HTML (like Cloudflare error pages)
            if (this.isHtmlResponse(data)) {
                const status = axiosError.response.status;
                const statusMessage = this.getStatusMessage(status, requestUrl);
                throw new NoTraceError(`${clientName}: ${statusMessage}`);
            }

            // Handle string error responses
            if (typeof data === "string" && data.length < 200) {
                throw new NoTraceError(`${clientName}: ${data}`);
            }
        }

        // Handle HTTP status codes
        if (axiosError.response?.status) {
            const status = axiosError.response.status;
            const data = axiosError.response.data;
            const statusMessage = this.getStatusMessage(status, requestUrl);
            throw new NoTraceError(`${clientName}: ${statusMessage}\n${JSON.stringify(data, null, 2)}`);
        }

        // Handle network errors
        if (axiosError.code === "ECONNREFUSED") {
            throw new NoTraceError(`${clientName}: Connection refused - The server is not reachable (${requestUrl})`);
        }

        if (axiosError.code === "ENOTFOUND") {
            throw new NoTraceError(`${clientName}: DNS lookup failed - Could not resolve hostname (${requestUrl})`);
        }

        if (axiosError.code === "ETIMEDOUT" || axiosError.code === "ECONNABORTED") {
            throw new NoTraceError(
                `${clientName}: Request timeout - The server did not respond in time (${requestUrl})`
            );
        }

        if (axiosError.code === "ERR_NETWORK") {
            throw new NoTraceError(`${clientName}: Network error - Unable to connect to the server (${requestUrl})`);
        }

        // Fallback for other axios errors
        if (axiosError.message) {
            throw new NoTraceError(`${clientName}: ${axiosError.message} (${requestUrl})`);
        }

        // Final fallback
        throw new NoTraceError(`${clientName}: An unexpected error occurred (${requestUrl})`);
    }

    /**
     * Initializes an axios instance with the given base URL and headers
     */
    protected createApi(baseUrl: string, headers: Record<string, string>): AxiosInstance {
        return axios.create({
            baseURL: baseUrl,
            headers,
        });
    }
}
