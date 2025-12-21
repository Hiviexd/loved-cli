import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Logger } from "../utils/logger";
import { Config, CONFIG_FILE_NAME } from "../config";
import { prompt } from "../utils/cli";
import chalk from "chalk";
import Ruleset from "../models/Ruleset";

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
        webhookOverrides: {} satisfies Record<Ruleset["shortName"], string>,
    };

    try {
        const content = await readFile(`config/${CONFIG_FILE_NAME}`, "utf8");
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
        log.dim().info(`You can edit these anytime in config/${CONFIG_FILE_NAME}`);
        log.dim().info(`You may also create a ${CONFIG_FILE_NAME} manually from config/config.example.json`);

        const lovedWebApiKey = await prompt(chalk.yellow("loved.sh API Key (get the key from loved.sh)"), {
            defaultValue: existing.lovedWebApiKey || undefined,
            showSkipHint: true,
        });

        const lovedAdminApiKey = await prompt(chalk.yellow("loved.sh Admin API Key (ask Hivie for a key)"), {
            defaultValue: existing.lovedAdminApiKey || undefined,
            showSkipHint: true,
        });

        const osuWikiPath = await prompt(chalk.yellow("osu-wiki directory path"), {
            defaultValue: existing.osuWikiPath || undefined,
            showSkipHint: true,
        });

        const lovedRoundId = await prompt(chalk.yellow("Active Loved round ID"), {
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
        await writeFile(`config/${CONFIG_FILE_NAME}`, JSON.stringify(config, null, 4) + "\n");

        log.success(`✓ Configuration saved to config/${CONFIG_FILE_NAME}`);

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
            log.dim().info(`Edit config/${CONFIG_FILE_NAME} to complete the configuration`);
        }
    });
