import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import chalk from "chalk";

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

        console.log(chalk.cyan("\n📋 Project Loved Configuration Setup"));
        console.log(chalk.dim("Press Enter to keep existing value or skip"));
        console.log(chalk.dim("You can edit these anytime in config/config.json"));
        console.log(chalk.dim("--------------------------------"));
        console.log(chalk.dim("For lovedRoundId, set it manually every round\n"));

        try {
            // Bot API Client
            console.log(chalk.yellow("─── osu! Bot API Client (ask Hivie for these) ───"));
            const botClientId = await prompt(rl, "Bot API Client ID", existing.botApiClient.id || undefined);
            const botClientSecret = await prompt(
                rl,
                "Bot API Client Secret",
                existing.botApiClient.secret || undefined
            );

            console.log();

            // loved.sh API
            console.log(chalk.yellow("─── loved.sh API (get these from loved.sh) ───"));
            const lovedWebApiKey = await prompt(rl, "loved.sh API Key", existing.lovedWebApiKey || undefined);
            const lovedWebBaseUrl = await prompt(rl, "loved.sh Base URL", existing.lovedWebBaseUrl);

            console.log();

            // Paths
            console.log(chalk.yellow("─── Paths ───"));
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

            console.log();
            console.log(chalk.green("✓ Configuration saved to config/config.json"));

            // Show warnings for missing required fields
            const warnings: string[] = [];
            if (!config.botApiClient.id) warnings.push("botApiClient.id");
            if (!config.botApiClient.secret) warnings.push("botApiClient.secret");
            if (!config.lovedWebApiKey) warnings.push("lovedWebApiKey");
            if (!config.lovedRoundId) warnings.push("lovedRoundId (set manually every round)");

            if (warnings.length > 0) {
                console.log(chalk.yellow(`\n⚠ Missing required fields: ${warnings.join(", ")}`));
                console.log(chalk.dim("Edit config/config.json to complete the configuration"));
            }
        } finally {
            rl.close();
        }
    });
