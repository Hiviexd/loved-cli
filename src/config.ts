import { readFile } from "node:fs/promises";
import chalk from "chalk";
import { z } from "zod";

/**
 * Schema for bot API client credentials
 */
const BotApiClientSchema = z.object({
    id: z.string().min(1, "Bot API client ID is required"),
    secret: z.string().min(1, "Bot API client secret is required"),
});

/**
 * Schema for application configuration
 */
const ConfigSchema = z.object({
    botApiClient: BotApiClientSchema,
    bannerTitleOverrides: z.record(z.string(), z.string()).default({}),
    lovedApiKey: z.string().min(1, "loved.sh API key is required"),
    lovedBaseUrl: z
        .string()
        .url("lovedBaseUrl must be a valid URL")
        .transform((url) => url.replace(/\/+$/, "")),
    lovedRoundId: z.number().int().positive("lovedRoundId must be a positive integer"),
    osuBaseUrl: z
        .string()
        .url("osuBaseUrl must be a valid URL")
        .transform((url) => url.replace(/\/+$/, "")),
    osuWikiPath: z.string().default(""),
});

/**
 * Schema for Discord messages
 */
const MessagesSchema = z.object({
    discordPost: z.string(),
    discordResults: z.string(),
});

/**
 * Default messages used in Discord posts
 */
const defaultMessages = {
    discordPost: "@everyone {{MAP_COUNT}} new maps have been nominated for Loved, check them out and cast your votes!",
    discordResults: "@everyone Results from the polls are in! The maps that passed voting will be moved to Loved soon.",
} satisfies z.infer<typeof MessagesSchema>;

/**
 * Full config type including messages
 */
export type Config = z.infer<typeof ConfigSchema>;
export type Messages = z.infer<typeof MessagesSchema>;
export type LoadedConfig = Config & { messages: Messages };

/**
 * Formats zod errors into readable messages
 */
function formatZodErrors(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
    });
}

/**
 * Loads and validates the configuration from config/config.json
 */
export async function loadConfig(): Promise<LoadedConfig> {
    let rawConfig: unknown;

    try {
        const configContent = await readFile("config/config.json", "utf8");
        rawConfig = JSON.parse(configContent);
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error(chalk.red("config/config.json contains invalid JSON"));
            console.error(chalk.red(error.message));
        } else {
            console.error(chalk.red("Failed to load config/config.json"));
            console.error(chalk.red('Run "pnpm loved setup" to create the config file'));
        }
        process.exit(1);
    }

    const result = ConfigSchema.safeParse(rawConfig);

    if (!result.success) {
        console.error(chalk.red("Configuration validation failed:"));
        for (const error of formatZodErrors(result.error)) {
            console.error(chalk.red(`  • ${error}`));
        }
        process.exit(1);
    }

    return {
        ...result.data,
        messages: defaultMessages,
    };
}
