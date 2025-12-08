import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Logger } from "../utils/logger";
import { Config } from "../config";
import { prompt } from "../utils/cli";
import chalk from "chalk";

const log = new Logger("setup");

/**
 * Loads existing config or returns defaults
 */
async function loadExistingConfig(): Promise<Config> {
    const defaults: Config = {
        lovedWebApiKey: "",
        lovedWebBaseUrl: "https://loved.sh",
        lovedAdminApiKey: "",
        lovedAdminBaseUrl: "https://admin.loved.sh",
        lovedRoundId: 0,
        osuBaseUrl: "https://osu.ppy.sh",
        osuWikiPath: "",
        updates: true,
        bannerTitleOverrides: {} satisfies Record<string, string>,
        webhookOverrides: [] satisfies { mode: string; url: string }[],
    };

    try {
        const content = await readFile("config/config.json", "utf8");
        const existing = JSON.parse(content) as Partial<Config>;
        return {
            ...defaults,
            ...existing,
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

        log.info("📋 Project Loved Configuration Setup");
        log.dim().info("Press Enter to keep existing value or skip");
        log.dim().info("You can edit these anytime in config/config.json");
        log.dim().info("You may also create a config.json manually from config/config.example.json\n");

        const lovedWebApiKey = await prompt(chalk.yellow("loved.sh API Key (get the key from loved.sh)"), {
            defaultValue: existing.lovedWebApiKey || undefined,
            showSkipHint: true,
        });

        const lovedAdminApiKey = await prompt(chalk.yellow("loved.sh Admin API Key (ask Hivie or Irisu for a key)"), {
            defaultValue: existing.lovedAdminApiKey || undefined,
            showSkipHint: true,
        });

        const osuWikiPath = await prompt(chalk.yellow("osu-wiki repository path"), {
            defaultValue: existing.osuWikiPath || undefined,
            showSkipHint: true,
        });

        const lovedRoundId = await prompt(chalk.yellow("Loved Round ID (must update manually every round)"), {
            defaultValue: existing.lovedRoundId.toString() || undefined,
            showSkipHint: true,
        });

        const updatesValue = await prompt(chalk.yellow("Enable automatic Git update checks (true/false)"), {
            defaultValue: existing.updates ? "true" : "false",
            showSkipHint: true,
        });
        const updates = updatesValue === "true";

        // Build config
        const config: Config = {
            lovedWebApiKey,
            lovedWebBaseUrl: existing.lovedWebBaseUrl,
            lovedAdminApiKey,
            lovedAdminBaseUrl: existing.lovedAdminBaseUrl,
            lovedRoundId: parseInt(lovedRoundId, 10),
            osuBaseUrl: existing.osuBaseUrl,
            osuWikiPath,
            updates,
            bannerTitleOverrides: existing.bannerTitleOverrides,
            webhookOverrides: existing.webhookOverrides,
        };

        // Write config
        await writeFile("config/config.json", JSON.stringify(config, null, 4) + "\n");

        log.success("✓ Configuration saved to config/config.json");

        // Show warnings for missing required fields
        const warnings: string[] = [];
        if (!config.lovedAdminApiKey) warnings.push("lovedAdminApiKey");
        if (!config.lovedAdminBaseUrl) warnings.push("lovedAdminBaseUrl");
        if (!config.lovedWebApiKey) warnings.push("lovedWebApiKey");
        if (!config.lovedWebBaseUrl) warnings.push("lovedWebBaseUrl");
        if (!config.osuWikiPath) warnings.push("osuWikiPath");
        if (!config.lovedRoundId) warnings.push("lovedRoundId");

        if (warnings.length > 0) {
            log.warning(`⚠ Missing required fields: ${warnings.join(", ")}`);
            log.dim().info("Edit config/config.json to complete the configuration");
        }
    });
