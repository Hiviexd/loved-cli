import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import chalk from "chalk";
import { Logger } from "../utils/logger";	

const log = new Logger("setup");

interface ConfigData {
    botApiClient: {
        id: string;
        secret: string;
    };
    bannerTitleOverrides: Record<string, string>;
    lovedWebApiKey: string;
    lovedWebBaseUrl: string;
    lovedRoundId: number;
    osuBaseUrl: string;
    osuWikiPath: string;
}

/**
 * Prompts the user for input with an optional default value
 */
async function prompt(rl: ReturnType<typeof createInterface>, message: string, defaultValue?: string): Promise<string> {
    const defaultHint = defaultValue ? chalk.dim(` (${defaultValue})`) : chalk.dim(" (skip)");
    const answer = await rl.question(`${message}${defaultHint}: `);
    return answer.trim() || defaultValue || "";
}

/**
 * Loads existing config or returns defaults
 */
async function loadExistingConfig(): Promise<ConfigData> {
    const defaults: ConfigData = {
        botApiClient: {
            id: "",
            secret: "",
        },
        bannerTitleOverrides: {},
        lovedWebApiKey: "",
        lovedWebBaseUrl: "https://loved.sh",
        lovedRoundId: 0,
        osuBaseUrl: "https://osu.ppy.sh",
        osuWikiPath: "",
    };

    try {
        const content = await readFile("config/config.json", "utf8");
        const existing = JSON.parse(content) as Partial<ConfigData>;
        return {
            ...defaults,
            ...existing,
            botApiClient: {
                ...defaults.botApiClient,
                ...existing.botApiClient,
            },
        };
    } catch {
        return defaults;
    }
}

export const setupCommand = new Command("setup")
    .description("Initialize and configure the project")
    .action(async () => {
        await mkdir("config", { recursive: true });

        const existing = await loadExistingConfig();
        const rl = createInterface({ input: stdin, output: stdout });

        log.info("📋 Project Loved Configuration Setup");
        log.dim().info("Press Enter to keep existing value or skip");
        log.dim().info("You can edit these anytime in config/config.json");
        log.dim().info("--------------------------------");
        log.dim().info("For lovedRoundId, set it manually every round\n");

        try {
            // Bot API Client
            log.warning("─── osu! Bot API Client (ask Hivie for these) ───");
            const botClientId = await prompt(rl, "Bot API Client ID", existing.botApiClient.id || undefined);
            const botClientSecret = await prompt(
                rl,
                "Bot API Client Secret",
                existing.botApiClient.secret || undefined
            );

            // loved.sh API
            log.warning("─── loved.sh API (get these from loved.sh) ───");
            const lovedWebApiKey = await prompt(rl, "loved.sh API Key", existing.lovedWebApiKey || undefined);
            const lovedWebBaseUrl = await prompt(rl, "loved.sh Base URL", existing.lovedWebBaseUrl);

            // Paths
            log.warning("─── Paths ───");
            const osuWikiPath = await prompt(rl, "osu-wiki repository path", existing.osuWikiPath || undefined);

            // Build config
            const config: ConfigData = {
                botApiClient: {
                    id: botClientId,
                    secret: botClientSecret,
                },
                bannerTitleOverrides: existing.bannerTitleOverrides,
                lovedWebApiKey,
                lovedWebBaseUrl,
                lovedRoundId: existing.lovedRoundId,
                osuBaseUrl: existing.osuBaseUrl,
                osuWikiPath,
            };

            // Write config
            await writeFile("config/config.json", JSON.stringify(config, null, 2) + "\n");

            log.success("✓ Configuration saved to config/config.json");

            // Show warnings for missing required fields
            const warnings: string[] = [];
            if (!config.botApiClient.id) warnings.push("botApiClient.id");
            if (!config.botApiClient.secret) warnings.push("botApiClient.secret");
            if (!config.lovedWebApiKey) warnings.push("lovedWebApiKey");
            if (!config.lovedRoundId) warnings.push("lovedRoundId (set manually every round)");

            if (warnings.length > 0) {
                log.warning(`⚠ Missing required fields: ${warnings.join(", ")}`);
                log.dim().info("Edit config/config.json to complete the configuration");
            }
        } finally {
            rl.close();
        }
    });
