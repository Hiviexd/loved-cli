import axios, { AxiosInstance, AxiosError } from "axios";
import { NoTraceError } from "../utils/logger";

export abstract class BaseApiClient {
    /**
     * The authenticated axios instance
     */
    protected api!: AxiosInstance;

    /**
     * Handles API errors
     */
    protected handleError(error: unknown): never {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            if (axiosError.response?.data?.error) {
                throw new NoTraceError(`[${this.constructor.name}] ${axiosError.response.data.error}`);
            }
        }
        throw error;
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
