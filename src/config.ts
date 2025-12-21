import { readFile } from "node:fs/promises";
import chalk from "chalk";
import { z } from "zod";

/**
 * Schema for application configuration
 */
const ConfigSchema = z.object({
    lovedWebApiKey: z.string().min(1, "loved.sh API key is required"),
    lovedWebBaseUrl: z.url("lovedWebBaseUrl must be a valid URL").transform((url) => url.replace(/\/+$/, "")),
    lovedAdminApiKey: z.string().min(1, "loved.sh admin API key is required"),
    lovedAdminBaseUrl: z.url("lovedAdminBaseUrl must be a valid URL").transform((url) => url.replace(/\/+$/, "")),
    lovedRoundId: z.number().int().positive("lovedRoundId must be a positive integer"),
    osuBaseUrl: z.url("osuBaseUrl must be a valid URL").transform((url) => url.replace(/\/+$/, "")),
    osuWikiPath: z.string().default(""),
    updates: z.boolean().default(true),
    bannerTitleOverrides: z.record(z.string(), z.string()).default({}),
    webhookOverrides: z.record(z.string(), z.url("webhook url must be a valid URL")).default({}),
});

/**
 * Full config type
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Formats zod errors into readable messages
 */
function formatZodErrors(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
    });
}

export const CONFIG_FILE_NAME = process.env.NODE_ENV === "development" ? "config.dev.json" : "config.json";

/**
 * Loads and validates the configuration from config/${CONFIG_FILE_NAME}
 */
export async function loadConfig(): Promise<Config> {
    let rawConfig: unknown;

    try {
        const configContent = await readFile(`config/${CONFIG_FILE_NAME}`, "utf8");
        rawConfig = JSON.parse(configContent);
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error(chalk.red(`config/${CONFIG_FILE_NAME} contains invalid JSON`));
            console.error(chalk.red(error.message));
        } else {
            console.error(chalk.red(`Failed to load config/${CONFIG_FILE_NAME}`));
            console.error(chalk.red(`Run "pnpm loved setup" to create the config file`));
        }
        process.exit(1);
    }

    const result = ConfigSchema.safeParse(rawConfig);

    if (!result.success) {
        console.error(chalk.red(`Configuration validation failed for ${CONFIG_FILE_NAME}:`));
        for (const error of formatZodErrors(result.error)) {
            console.error(chalk.red(`  • ${error}`));
        }
        process.exit(1);
    }

    return result.data;
}
