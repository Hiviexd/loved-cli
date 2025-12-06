import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Logger } from "../utils/logger";
import { Config } from "../config";
import { prompt } from "../utils/cli";

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
        log.dim().info("--------------------------------");
        log.dim().info("For lovedRoundId, set it manually every round\n");

        // loved.sh API
        log.warning("─── loved.sh API (get the key from loved.sh) ───");
        const lovedWebApiKey = await prompt("loved.sh API Key", {
            defaultValue: existing.lovedWebApiKey || undefined,
            showSkipHint: true,
        });
        const lovedWebBaseUrl = await prompt("loved.sh Base URL", {
            defaultValue: existing.lovedWebBaseUrl,
            showSkipHint: true,
        });

        log.warning("─── loved.sh Admin API (ask Hivie or Irisu for a key) ───");
        const lovedAdminApiKey = await prompt("loved.sh Admin API Key", {
            defaultValue: existing.lovedAdminApiKey || undefined,
            showSkipHint: true,
        });
        const lovedAdminBaseUrl = await prompt("loved.sh Admin Base URL", {
            defaultValue: existing.lovedAdminBaseUrl,
            showSkipHint: true,
        });

        // Paths
        log.warning("─── Paths ───");
        const osuWikiPath = await prompt("osu-wiki repository path", {
            defaultValue: existing.osuWikiPath || undefined,
            showSkipHint: true,
        });

        // Build config
        const config: Config = {
            lovedWebApiKey,
            lovedWebBaseUrl,
            lovedAdminApiKey,
            lovedAdminBaseUrl,
            lovedRoundId: existing.lovedRoundId,
            osuBaseUrl: existing.osuBaseUrl,
            osuWikiPath,
            bannerTitleOverrides: existing.bannerTitleOverrides,
            webhookOverrides: existing.webhookOverrides,
        };

        // Write config
        await writeFile("config/config.json", JSON.stringify(config, null, 2) + "\n");

        log.success("✓ Configuration saved to config/config.json");

        // Show warnings for missing required fields
        const warnings: string[] = [];
        if (!config.lovedAdminApiKey) warnings.push("lovedAdminApiKey");
        if (!config.lovedAdminBaseUrl) warnings.push("lovedAdminBaseUrl");
        if (!config.lovedWebApiKey) warnings.push("lovedWebApiKey");
        if (!config.lovedWebBaseUrl) warnings.push("lovedWebBaseUrl");
        if (!config.lovedRoundId) warnings.push("lovedRoundId (set manually every round)");
        if (!config.osuWikiPath) warnings.push("osuWikiPath");

        if (warnings.length > 0) {
            log.warning(`⚠ Missing required fields: ${warnings.join(", ")}`);
            log.dim().info("Edit config/config.json to complete the configuration");
        }
    });
