import { Command } from "commander";
import { loadConfig } from "../../config";
import { LovedAdminClient } from "../../clients/LovedAdminClient";
import { Logger, logAndExit } from "../../utils/logger";

const log = new Logger("admin-key");

export const adminKeyCommand = new Command("key")
    .description("Create an admin API key for a user")
    .argument("<userId>", "The osu! user ID to create an admin API key for", parseInt)
    .action(async (userId: number) => {
        const config = await loadConfig();
        const lovedAdmin = new LovedAdminClient(config.lovedAdminBaseUrl, config.lovedAdminApiKey);

        log.info(`Creating admin API key for user #${userId}...`);
        const response = await lovedAdmin.createAdminApiKey(userId).catch(logAndExit);

        if (response.success) {
            log.success(
                `Successfully created admin API key for ${response.data.user.name} (ID: ${response.data.user.id})`
            );
            if (response.data.token) {
                log.dim().info(`API Key: ${response.data.token}`);
            }
        } else {
            logAndExit(new Error(response.message || "Failed to create admin API key"));
        }
    });
